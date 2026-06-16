import pool from './src/config/db.js';

async function clearDatabase() {
  console.log('🗑️ Clearing database...');
  const tables = ['tenant_categories', 'receipts', 'invoices', 'units', 'tenants', 'excel_uploads', 'properties'];
  
  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table} CASCADE;`);
      console.log(`✅ Cleared ${table}`);
    } catch (err) {
      console.warn(`⚠️ Could not clear ${table}: ${err.message}`);
    }
  }
  
  console.log('✅ Database clearing process finished!');
  process.exit(0);
}

clearDatabase();
