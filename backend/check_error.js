import pool from './src/config/db.js';

async function checkLastError() {
  try {
    const { rows } = await pool.query(`SELECT id, status, rows_imported, rows_skipped, error_log FROM excel_uploads ORDER BY uploaded_at DESC LIMIT 3`);
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkLastError();
