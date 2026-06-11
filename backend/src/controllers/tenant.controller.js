import pool from '../config/db.js';
import { logAudit } from '../services/audit.service.js';

export async function getAllTenants(req, res) {
  const { search, property_id, is_active, category } = req.query;

  let query = `
    SELECT
      t.*,
      p.name  AS property_name,
      p.city  AS property_city,
      CASE
        WHEN t.lease_end IS NULL                              THEN 'No Lease'
        WHEN t.lease_end < CURRENT_DATE                      THEN 'Expired'
        WHEN t.lease_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'Active'
      END AS lease_status,
      (t.lease_end - CURRENT_DATE) AS days_to_expiry,
      -- escalation status live
      CASE
        WHEN t.escalation_due_date IS NULL        THEN 'No Escalation'
        WHEN t.escalation_applied = TRUE          THEN 'Applied'
        WHEN t.escalation_due_date < CURRENT_DATE THEN 'Overdue'
        WHEN t.escalation_due_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'Due Soon'
        ELSE 'Upcoming'
      END AS escalation_status,
      (t.escalation_due_date - CURRENT_DATE) AS escalation_days_left,
      -- difference
      COALESCE(t.escalation_new_rent, 0) - COALESCE(t.monthly_rent, 0) AS escalation_diff,
      -- categories
      COALESCE(
        (SELECT json_agg(json_build_object('category', tc.category, 'amount', tc.amount))
         FROM tenant_categories tc
         WHERE tc.tenant_id = t.id AND tc.is_active = TRUE),
        '[]'::json
      ) AS categories,
      (
        SELECT json_agg(u.id)
        FROM units u
        WHERE u.tenant_id = t.id AND u.is_active = TRUE
      ) AS unit_ids
    FROM tenants t
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (t.name ILIKE $${params.length}
                OR t.unit_no ILIKE $${params.length}
                OR t.gstin   ILIKE $${params.length})`;
  }
  if (property_id) {
    params.push(property_id);
    query += ` AND t.property_id = $${params.length}`;
  }
  if (is_active !== undefined) {
    params.push(is_active === 'true');
    query += ` AND t.is_active = $${params.length}`;
  }
  if (category) {
    params.push(category);
    query += ` AND EXISTS (
      SELECT 1 FROM tenant_categories tc 
      WHERE tc.tenant_id = t.id AND tc.category = $${params.length} AND tc.is_active = TRUE
    )`;
  }

  query += ` ORDER BY t.created_at DESC`;
  const { rows } = await pool.query(query, params);
  res.json({ success: true, data: rows });
}

export async function getTenantById(req, res) {
  const { rows } = await pool.query(
    `SELECT
       t.*,
       p.name AS property_name,
       p.city AS property_city,
       (t.escalation_due_date - CURRENT_DATE) AS escalation_days_left,
       COALESCE(t.escalation_new_rent,0) - COALESCE(t.monthly_rent,0) AS escalation_diff
     FROM tenants t
     LEFT JOIN properties p ON p.id = t.property_id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (!rows.length)
    return res.status(404).json({ success: false, message: 'Tenant not found' });

  // also fetch categories
  const cats = await pool.query(
    `SELECT * FROM tenant_categories WHERE tenant_id = $1 AND is_active = TRUE`,
    [req.params.id]
  );
  
  const unitRes = await pool.query(
    `SELECT id FROM units WHERE tenant_id = $1 AND is_active = TRUE`,
    [req.params.id]
  );
  
  res.json({ 
    success: true, 
    data: { 
      ...rows[0], 
      categories: cats.rows,
      unit_ids: unitRes.rows.map(u => u.id)
    } 
  });
}

export async function createTenant(req, res) {
  const {
    property_id, name, email, phone, gstin, unit_no,
    lease_start, lease_end, monthly_rent, security_deposit,
    tenant_area, rate_per_sft, cam_amount,
    escalation_pct, escalation_due_date, escalation_new_rent,
    escalation_applied, is_active, unit_ids, attachment_url
  } = req.body;

  const prop = await pool.query(
    `SELECT id FROM properties WHERE id = $1`, [property_id]
  );
  if (!prop.rows.length)
    return res.status(404).json({ success: false, message: 'Property not found' });

  const { rows } = await pool.query(
    `INSERT INTO tenants
       (property_id, name, email, phone, gstin, unit_no,
        lease_start, lease_end, monthly_rent, security_deposit,
        tenant_area, rate_per_sft, cam_amount,
        escalation_pct, escalation_due_date, escalation_new_rent,
        escalation_applied, is_active, attachment_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     RETURNING *`,
    [
      property_id, name, email, phone, gstin, unit_no,
      lease_start || null, lease_end || null,
      monthly_rent || 0, security_deposit || 0,
      tenant_area || null, rate_per_sft || null, cam_amount || 0,
      escalation_pct || null,
      escalation_due_date || null,
      escalation_new_rent || null,
      escalation_applied || false,
      is_active,
      attachment_url || null,
    ]
  );
  
  const newTenant = rows[0];

  // Update units if provided
  if (unit_ids && Array.isArray(unit_ids) && unit_ids.length > 0) {
    // first clear any existing assignment if someone else had it (optional, but good for safety)
    // then assign to this tenant
    const unitPlaceholders = unit_ids.map((_, i) => `$${i + 2}`).join(',');
    await pool.query(
      `UPDATE units SET tenant_id = $1 WHERE id IN (${unitPlaceholders})`,
      [newTenant.id, ...unit_ids]
    );
  }

  await logAudit(req.user, 'CREATE', 'TENANT', newTenant.id, { name, property_id, unit_ids });

  res.status(201).json({ success: true, data: newTenant });
}

export async function updateTenant(req, res) {
  const fields = { ...req.body };
  const unit_ids = fields.unit_ids;
  delete fields.unit_ids; // Don't try to update unit_ids on the tenants table directly
  
  if (fields.lease_start === '') fields.lease_start = null;
  if (fields.lease_end === '') fields.lease_end = null;
  if (fields.escalation_due_date === '') fields.escalation_due_date = null;

  const keys = Object.keys(fields);
  if (!keys.length)
    return res.status(400).json({ success: false, message: 'Nothing to update' });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...Object.values(fields), req.params.id];

  const { rows } = await pool.query(
    `UPDATE tenants SET ${setClauses}, updated_at = NOW()
     WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length)
    return res.status(404).json({ success: false, message: 'Tenant not found' });
    
  // If unit_ids are provided, update the units
  if (unit_ids !== undefined) {
    // First, clear tenant_id from all units currently assigned to this tenant
    await pool.query(`UPDATE units SET tenant_id = NULL WHERE tenant_id = $1`, [req.params.id]);
    
    // Then assign the new units
    if (Array.isArray(unit_ids) && unit_ids.length > 0) {
      const unitPlaceholders = unit_ids.map((_, i) => `$${i + 2}`).join(',');
      await pool.query(
        `UPDATE units SET tenant_id = $1 WHERE id IN (${unitPlaceholders})`,
        [req.params.id, ...unit_ids]
      );
    }
  }

  await logAudit(req.user, 'UPDATE', 'TENANT', req.params.id, { ...fields, unit_ids });

  res.json({ success: true, data: rows[0] });
}

export async function deleteTenant(req, res) {
  const { rows } = await pool.query(
    `DELETE FROM tenants WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (!rows.length)
    return res.status(404).json({ success: false, message: 'Tenant not found' });
    
  await logAudit(req.user, 'DELETE', 'TENANT', req.params.id, { deleted: true });

  res.json({ success: true, message: 'Tenant completely deleted' });
}

// ─── Category management ──────────────────────────────────────────────────────
export async function getTenantCategories(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM tenant_categories
     WHERE tenant_id = $1 AND is_active = TRUE
     ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ success: true, data: rows });
}

export async function upsertTenantCategories(req, res) {
  const { categories } = req.body;
  // categories: [{ category, amount }]
  if (!Array.isArray(categories) || !categories.length)
    return res.status(400).json({ success: false, message: 'categories array required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // deactivate existing
    await client.query(
      `UPDATE tenant_categories SET is_active = FALSE WHERE tenant_id = $1`,
      [req.params.id]
    );
    // insert new
    for (const cat of categories) {
      await client.query(
        `INSERT INTO tenant_categories (tenant_id, category, amount)
         VALUES ($1, $2, $3)`,
        [req.params.id, cat.category, cat.amount]
      );
    }
    await client.query('COMMIT');
    const { rows } = await pool.query(
      `SELECT * FROM tenant_categories
       WHERE tenant_id = $1 AND is_active = TRUE`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Escalation tracker ───────────────────────────────────────────────────────
export async function getEscalationTracker(req, res) {
  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.name                    AS tenant_name,
       p.name                    AS property_name,
       t.tenant_area,
       t.rate_per_sft,
       t.monthly_rent,
       t.cam_amount,
       (COALESCE(t.monthly_rent,0) + COALESCE(t.cam_amount,0)) AS total_rent,
       t.escalation_pct,
       t.escalation_due_date,
       t.escalation_new_rent,
       t.escalation_applied,
       COALESCE(t.escalation_new_rent,0)
         - COALESCE(t.monthly_rent,0)                          AS escalation_diff,
       (t.escalation_due_date - CURRENT_DATE)                  AS days_left,
       CASE
         WHEN t.escalation_due_date IS NULL        THEN 'No Escalation'
         WHEN t.escalation_applied  = TRUE         THEN 'Applied'
         WHEN t.escalation_due_date < CURRENT_DATE THEN 'Overdue'
         WHEN t.escalation_due_date
              <= CURRENT_DATE + INTERVAL '60 days' THEN 'Due Soon'
         ELSE 'Upcoming'
       END                                                      AS escalation_status
     FROM tenants t
     LEFT JOIN properties p ON p.id = t.property_id
     WHERE t.is_active = TRUE
       AND t.escalation_due_date IS NOT NULL
     ORDER BY
       CASE
         WHEN t.escalation_due_date < CURRENT_DATE THEN 1
         WHEN t.escalation_due_date
              <= CURRENT_DATE + INTERVAL '60 days' THEN 2
         ELSE 3
       END,
       t.escalation_due_date ASC`
  );
  res.json({ success: true, data: rows });
}

export async function applyEscalation(req, res) {
  const { id } = req.params;

  const tenantRes = await pool.query(
    `SELECT * FROM tenants WHERE id = $1`, [id]
  );
  const { rows } = await pool.query(
    `UPDATE tenants SET
       monthly_rent = escalation_new_rent,
       escalation_applied = TRUE,
       updated_at = NOW()
     WHERE id = $1 AND escalation_new_rent IS NOT NULL
     RETURNING *`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Tenant or escalation data not found' });
  res.json({ success: true, message: 'Escalation applied successfully', data: rows[0] });
}

import { uploadToSupabase } from '../services/supabaseUpload.service.js';

export async function uploadTenantFile(req, res) {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const filename = await uploadToSupabase(req.file, 'tenant');
    res.json({ success: true, fileUrl: filename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}