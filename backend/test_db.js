import pool from './src/config/db.js';

async function test() {
  try {
    const res = await pool.query('SELECT * FROM users');
    console.log('Users:', res.rows);
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit();
}
test();
