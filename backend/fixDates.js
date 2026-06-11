import pool from './src/config/db.js';

async function updateBillingMonths() {
  const { rows } = await pool.query('SELECT id, billing_month FROM invoices');
  let updatedCount = 0;
  for (const row of rows) {
    if (row.billing_month && row.billing_month.length > 15 && row.billing_month.includes('GMT')) {
      const dateObj = new Date(row.billing_month);
      if (!isNaN(dateObj.getTime())) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatted = `${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
        await pool.query('UPDATE invoices SET billing_month = $1 WHERE id = $2', [formatted, row.id]);
        updatedCount++;
      }
    }
  }
  console.log(`Updated ${updatedCount} invoices.`);
  process.exit(0);
}

updateBillingMonths();
