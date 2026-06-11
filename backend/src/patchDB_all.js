import pool from './config/db.js';

async function patch() {
  try {
    console.log('🔄 Patching database schema...');
    
    // 1. Patch Receipts Table
    await pool.query('ALTER TABLE receipts ADD COLUMN IF NOT EXISTS attachment_url TEXT');
    console.log('✅ Added attachment_url to receipts table');

    // 2. Patch Tenants Table
    const alterTenants = `
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS tenant_area NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS rate_per_sft NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS cam_amount NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS escalation_pct NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS escalation_due_date DATE,
      ADD COLUMN IF NOT EXISTS escalation_new_rent NUMERIC(14,2),
      ADD COLUMN IF NOT EXISTS escalation_applied BOOLEAN DEFAULT FALSE
    `;
    await pool.query(alterTenants);
    console.log('✅ Added all required columns to tenants table (tenant_area, cam_amount, etc.)');

    console.log('🎉 Database patched successfully! You can now restart your server.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching database:', err.message);
    process.exit(1);
  }
}

patch();
