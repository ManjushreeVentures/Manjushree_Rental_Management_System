import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const { rows } = await pool.query(`SELECT bill_amount, amount_collected, outstanding_balance FROM invoices ORDER BY id DESC LIMIT 5`);
    console.log(rows);
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    pool.end();
  }
}
run();
