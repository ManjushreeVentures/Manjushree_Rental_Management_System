import pool from '../config/db.js';
import { logAudit } from '../services/audit.service.js';

let migrated = false;

export async function getAllProperties(req, res) {
  if (!migrated) {
    try {
      await pool.query(`
        ALTER TABLE properties 
        ADD COLUMN IF NOT EXISTS gstin TEXT,
        ADD COLUMN IF NOT EXISTS total_area NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS leased_area NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS vacant_area NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS vacated_date DATE;
      `);
      migrated = true;
    } catch (e) { console.error('Migration error:', e); }
  }

  const { search, is_active } = req.query;

  let query = `SELECT * FROM properties WHERE name IS DISTINCT FROM 'Internal'`;
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (name ILIKE $${params.length} OR owner_name ILIKE $${params.length})`;
  }
  if (is_active !== undefined) {
    params.push(is_active === 'true');
    query += ` AND is_active = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC`;

  const { rows } = await pool.query(query, params);

  // Fetch all active units to dynamically calculate areas
  const unitsResult = await pool.query(`SELECT property_id, total_area, tenant_id, rent_amount FROM units WHERE is_active = true`);
  const allUnits = unitsResult.rows;

  // Fetch tenants for properties that don't use the units system
  const tenantsResult = await pool.query(`SELECT property_id, SUM(tenant_area) as leased_area, SUM(COALESCE(monthly_rent,0) + COALESCE(cam_amount,0)) as total_rent FROM tenants WHERE is_active = true GROUP BY property_id`);
  const tenantSums = tenantsResult.rows;

  const dynamicProperties = rows.map(property => {
    const propertyUnits = allUnits.filter(u => u.property_id === property.id);

    if (propertyUnits.length > 0) {
      let calcTotalArea = 0;
      let calcLeasedArea = 0;
      let calcVacantArea = 0;
      let calcTotalAmount = 0;

      for (const u of propertyUnits) {
        const area = Number(u.total_area) || 0;
        const rent = Number(u.rent_amount) || 0;

        calcTotalArea += area;
        if (u.tenant_id) {
          calcLeasedArea += area;
          calcTotalAmount += rent;
        } else {
          calcVacantArea += area;
        }
      }

      const propertyTotalArea = Number(property.total_area) || 0;
      if (propertyTotalArea > calcTotalArea) {
        calcVacantArea += (propertyTotalArea - calcTotalArea);
        calcTotalArea = propertyTotalArea;
      }

      property.total_area = calcTotalArea;
      property.leased_area = calcLeasedArea;
      property.vacant_area = calcVacantArea;
      property.total_amount = calcTotalAmount;
    } else {
      // Fallback: Calculate from tenants if there are no units
      const tSum = tenantSums.find(t => t.property_id === property.id);
      if (tSum) {
        property.leased_area = Number(tSum.leased_area) || 0;
        property.total_amount = Number(tSum.total_rent) || 0;
        // Without units, total area is at least the leased area, or whatever was set manually
        property.total_area = Math.max(Number(property.total_area) || 0, property.leased_area);
        property.vacant_area = Math.max(0, property.total_area - property.leased_area);
      }
    }
    return property;
  });

  res.json({ success: true, data: dynamicProperties });
}

export async function getPropertyById(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM properties WHERE id = $1`, [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Property not found' });

  const property = rows[0];

  // Fetch units for dynamic calculations
  const unitsResult = await pool.query(
    `SELECT u.*, t.name as tenant_name 
     FROM units u 
     LEFT JOIN tenants t ON u.tenant_id = t.id 
     WHERE u.property_id = $1 AND u.is_active = true`,
    [req.params.id]
  );

  const units = unitsResult.rows;

  let calcTotalArea = 0;
  let calcLeasedArea = 0;
  let calcVacantArea = 0;
  let calcTotalAmount = 0;

  for (const u of units) {
    const area = Number(u.total_area) || 0;
    const rent = Number(u.rent_amount) || 0;

    calcTotalArea += area;
    if (u.tenant_id) {
      calcLeasedArea += area;
      calcTotalAmount += rent;
    } else {
      calcVacantArea += area;
    }
  }

  // If the property has units, override the static fields with dynamic ones
  if (units.length > 0) {
    const propertyTotalArea = Number(property.total_area) || 0;
    if (propertyTotalArea > calcTotalArea) {
      calcVacantArea += (propertyTotalArea - calcTotalArea);
      calcTotalArea = propertyTotalArea;
    }

    property.total_area = calcTotalArea;
    property.leased_area = calcLeasedArea;
    property.vacant_area = calcVacantArea;
    property.total_amount = calcTotalAmount;
  } else {
    // Fallback: Calculate from tenants if there are no units
    const tenantsResult = await pool.query(`SELECT SUM(tenant_area) as leased_area, SUM(monthly_rent) as total_rent FROM tenants WHERE property_id = $1 AND is_active = true`, [req.params.id]);
    const tSum = tenantsResult.rows[0];
    if (tSum && (tSum.leased_area || tSum.total_rent)) {
      property.leased_area = Number(tSum.leased_area) || 0;
      property.total_amount = Number(tSum.total_rent) || 0;
      property.total_area = Math.max(Number(property.total_area) || 0, property.leased_area);
      property.vacant_area = Math.max(0, property.total_area - property.leased_area);
    }
  }

  property.units = units;

  res.json({ success: true, data: property });
}

export async function createProperty(req, res) {
  const { name, address, owner_name, gstin, total_area, leased_area, vacant_area, total_amount, is_active, attachment_url } = req.body;

  // check duplicate name
  const existing = await pool.query(`SELECT id FROM properties WHERE name = $1`, [name]);
  if (existing.rows.length) {
    return res.status(409).json({ success: false, message: 'Property name already exists' });
  }

  const { rows } = await pool.query(
    `INSERT INTO properties (name, address, owner_name, gstin, total_area, leased_area, vacant_area, total_amount, is_active, attachment_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [name, address, owner_name, gstin, total_area, leased_area, vacant_area, total_amount, is_active, attachment_url]
  );

  await logAudit(req.user, 'CREATE', 'PROPERTY', rows[0].id, { name, address, owner_name, gstin });

  res.status(201).json({ success: true, data: rows[0] });
}

export async function updateProperty(req, res) {
  const fields = req.body;
  const keys = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = [...Object.values(fields), req.params.id];

  const { rows } = await pool.query(
    `UPDATE properties SET ${setClauses}, updated_at = NOW()
     WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Property not found' });

  await logAudit(req.user, 'UPDATE', 'PROPERTY', rows[0].id, fields);

  res.json({ success: true, data: rows[0] });
}

export async function deleteProperty(req, res) {
  const { vacated_date } = req.body;
  const { rows } = await pool.query(
    `UPDATE properties SET is_active = FALSE, vacated_date = $1, updated_at = NOW()
     WHERE id = $2 RETURNING id`,
    [vacated_date || new Date().toISOString().split('T')[0], req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Property not found' });

  await logAudit(req.user, 'DELETE', 'PROPERTY', req.params.id, { vacated_date });

  res.json({ success: true, message: 'Property vacated' });
}

import { uploadToSupabase } from '../services/supabaseUpload.service.js';

export async function uploadPropertyFile(req, res) {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const filename = await uploadToSupabase(req.file, 'property');
    res.json({ success: true, fileUrl: filename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}