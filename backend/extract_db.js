import pool from './src/config/db.js';
import fs from 'fs';

async function check() {
  try {
    const invoices = await pool.query(`SELECT id, property_name, tenant_name, category, bill_date, bill_amount, billing_month FROM invoices ORDER BY bill_date DESC LIMIT 50`);
    
    const logs = await pool.query(`SELECT * FROM excel_uploads ORDER BY uploaded_at DESC LIMIT 1`);
    
    let out = "INVOICES:\n";
    out += JSON.stringify(invoices.rows, null, 2);
    out += "\n\nUPLOAD LOGS:\n";
    out += JSON.stringify(logs.rows, null, 2);
    
    fs.writeFileSync('db_output.txt', out);
    console.log("Wrote to db_output.txt");
  } catch (err) {
    fs.writeFileSync('db_output.txt', "ERROR: " + err.message);
  } finally {
    process.exit(0);
  }
}
check();
