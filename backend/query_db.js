import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/rental_db' });

async function query() {
  const res = await pool.query(`
    SELECT t.name as tenant_name, 
           COALESCE(SUM(tc.amount), 0) as bill_amount 
    FROM tenants t 
    LEFT JOIN tenant_categories tc ON tc.tenant_id = t.id AND tc.is_active = true 
    GROUP BY t.id, t.name 
    ORDER BY t.name
  `);
  console.table(res.rows);
  process.exit(0);
}
query();
