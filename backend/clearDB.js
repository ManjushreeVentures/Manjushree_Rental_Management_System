import pool from './src/config/db.js';

async function clearDatabase() {
  try {
    console.log('🗑️ Clearing database...');
    // Drop all data but keep the tables
    await pool.query('TRUNCATE TABLE properties, units, tenants, invoices, receipts, excel_uploads, tenant_categories CASCADE;');
    console.log('✅ Database completely cleared!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  }
}

clearDatabase();
