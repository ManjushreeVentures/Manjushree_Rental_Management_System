import pool from './src/config/db.js';

async function check() {
  try {
    const res = await pool.query(`SELECT billing_month, bill_date, bill_amount, category, status FROM invoices WHERE tenant_name ILIKE '%Alternicq%' ORDER BY bill_date DESC`);
    console.log("Alternicq Invoices in DB:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
