import pool from '../backend/src/config/db.js';

async function fixBillingMonths() {
  try {
    const { rows } = await pool.query('SELECT id, billing_month FROM invoices');
    for (const row of rows) {
      if (row.billing_month && row.billing_month.length > 8) {
        // likely a date string
        const d = new Date(row.billing_month);
        if (!isNaN(d.getTime())) {
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const newMonth = `${months[d.getMonth()]}-${d.getFullYear()}`;
          await pool.query('UPDATE invoices SET billing_month = $1 WHERE id = $2', [newMonth, row.id]);
          console.log(`Updated ${row.id} from ${row.billing_month} to ${newMonth}`);
        }
      }
    }
    console.log('Done fixing billing months.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixBillingMonths();
