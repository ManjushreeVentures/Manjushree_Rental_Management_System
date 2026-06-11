import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const { rows } = await pool.query(`SELECT id, tenant_name, bill_amount, amount_collected, outstanding_balance FROM invoices ORDER BY created_at DESC LIMIT 5`);
    console.log("----- LATEST 5 INVOICES FROM DATABASE -----");
    console.table(rows);
    
    const receipts = await pool.query(`SELECT id, amount, payment_mode FROM receipts ORDER BY created_at DESC LIMIT 5`);
    console.log("\n----- LATEST 5 RECEIPTS FROM DATABASE -----");
    console.table(receipts.rows);
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    pool.end();
  }
}
run();
