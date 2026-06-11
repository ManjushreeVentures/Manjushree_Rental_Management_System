import pool from './src/config/db.js';

async function checkDbSize() {
  try {
    console.log('--- Database Size Report ---');
    
    // 1. Total Database Size
    const { rows: dbSizeRows } = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size;
    `);
    console.log(`Total Database Size: ${dbSizeRows[0].total_size}`);

    // 2. Size per table
    console.log('\n--- Size per Table ---');
    const { rows: tableSizeRows } = await pool.query(`
      SELECT
          relname as "Table",
          pg_size_pretty(pg_total_relation_size(relid)) As "Size",
          pg_size_pretty(pg_relation_size(relid)) as "Data Size",
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as "Index Size"
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `);
    
    console.table(tableSizeRows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

checkDbSize();
