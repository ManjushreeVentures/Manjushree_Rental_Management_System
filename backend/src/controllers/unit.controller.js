import pool from '../config/db.js';

let migrated = false;

export async function getAllUnits(req, res) {
  if (!migrated) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS units (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id   UUID REFERENCES properties(id) ON DELETE CASCADE,
          name          TEXT NOT NULL,
          total_area    NUMERIC(14,2) NOT NULL,
          tenant_id     UUID,
          rent_amount   NUMERIC(14,2) DEFAULT 0,
          is_active     BOOLEAN DEFAULT TRUE,
          created_at    TIMESTAMPTZ DEFAULT NOW(),
          updated_at    TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      migrated = true;
    } catch (e) { console.error('Migration error (units):', e); }
  }

  const { property_id } = req.query;

  let query = `SELECT * FROM units WHERE is_active = true`;
  const params = [];

  if (property_id) {
    params.push(property_id);
    query += ` AND property_id = $${params.length}`;
  }

  query += ` ORDER BY created_at ASC`;

  const { rows } = await pool.query(query, params);
  res.json({ success: true, data: rows });
}

export async function createUnit(req, res) {
  const { property_id, name, total_area, tenant_id, rent_amount, is_active } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO units (property_id, name, total_area, tenant_id, rent_amount, is_active)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [property_id, name, total_area, tenant_id, rent_amount, is_active ?? true]
  );
  res.status(201).json({ success: true, data: rows[0] });
}

export async function updateUnit(req, res) {
  const fields = req.body;
  const keys   = Object.keys(fields);
  if (!keys.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values     = [...Object.values(fields), req.params.id];

  const { rows } = await pool.query(
    `UPDATE units SET ${setClauses}, updated_at = NOW()
     WHERE id = $${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Unit not found' });
  res.json({ success: true, data: rows[0] });
}

export async function deleteUnit(req, res) {
  const { rows } = await pool.query(
    `UPDATE units SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ success: false, message: 'Unit not found' });
  res.json({ success: true, message: 'Unit deleted' });
}
