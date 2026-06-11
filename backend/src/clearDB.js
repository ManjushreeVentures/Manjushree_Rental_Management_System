import pool from './config/db.js';

async function clearDatabase() {
  try {
    console.log('🗑️  Starting database clear...');
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Truncate tables and cascade to any dependent tables
      await client.query(`
        TRUNCATE TABLE 
          properties, 
          tenants, 
          tenant_categories, 
          invoices, 
          receipts 
        CASCADE
      `);

      await client.query('COMMIT');
      console.log('✅ Successfully cleared all data from the database!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  }
}

clearDatabase();
