import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function run() {
  try {
    await pool.query('ALTER TABLE properties ADD COLUMN IF NOT EXISTS attachment_url TEXT');
    console.log('✅ Added attachment_url to properties table');
    
    await pool.query('ALTER TABLE tenants ADD COLUMN IF NOT EXISTS attachment_url TEXT');
    console.log('✅ Added attachment_url to tenants table');
    
    process.exit(0);
  } catch (err) {
    console.error('Error adding columns:', err);
    process.exit(1);
  }
}
run();
