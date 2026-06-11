import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const { rows } = await pool.query(`SELECT id, name, property_id FROM tenants ORDER BY name ASC`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    pool.end();
  }
}
run();
