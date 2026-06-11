import pool from './src/config/db.js';

async function deleteProperties() {
  try {
    const names = ['test', 'Ankit Kedia', 'Jallan', 'MUCPL-Bidadi', 'Vimal Kedia'];
    const res = await pool.query('DELETE FROM properties WHERE name = ANY($1)', [names]);
    console.log(`Deleted ${res.rowCount} properties.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

deleteProperties();
