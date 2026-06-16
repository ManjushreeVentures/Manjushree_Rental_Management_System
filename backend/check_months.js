import pool from './src/config/db.js';
import fs from 'fs';

async function check() {
  try {
    const { rows } = await pool.query('SELECT DISTINCT billing_month FROM invoices');
    fs.writeFileSync('months.json', JSON.stringify(rows, null, 2));
    console.log('Done');
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
