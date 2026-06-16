import pool from './src/config/db.js';
async function run() {
  try {
    const res = await pool.query("SELECT invoices.*, tenants.name as tenant_name FROM invoices JOIN tenants ON invoices.tenant_id = tenants.id WHERE tenants.name = 'Alternicq Limited' AND category = 'Rent & CAM'");
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
