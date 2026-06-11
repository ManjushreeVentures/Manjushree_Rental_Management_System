import pool from './config/db.js';

async function readFunction() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'compute_aging_bucket';
    `);
    console.log(rows[0].pg_get_functiondef);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

readFunction();
