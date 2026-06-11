import pool from './config/db.js';

async function check() {
  const res = await pool.query(`
    SELECT pg_get_functiondef(oid) 
    FROM pg_proc 
    WHERE proname = 'compute_aging_bucket'
  `);
  console.log(res.rows[0]?.pg_get_functiondef);
  process.exit();
}
check();
