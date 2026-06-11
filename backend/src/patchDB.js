import pool from './config/db.js';

async function patch() {
  try {
    console.log('Patching database...');
    await pool.query('ALTER TABLE receipts ADD COLUMN IF NOT EXISTS attachment_url TEXT');
    console.log('✅ Added attachment_url to receipts table');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error patching database:', err.message);
    process.exit(1);
  }
}

patch();
