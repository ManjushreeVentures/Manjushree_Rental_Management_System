import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const { rows } = await pool.query(
      `SELECT
         p.name              AS "Property",
         t.name              AS "Tenant",
         t.unit_no           AS "Unit",
         t.gstin             AS "GSTIN",
         t.monthly_rent      AS "Monthly Rent",
         t.security_deposit  AS "Security Deposit",
         t.lease_start       AS "Lease Start",
         t.lease_end         AS "Lease End",
         (t.lease_end - CURRENT_DATE) AS "Days to Expiry",
         CASE
           WHEN t.lease_end < CURRENT_DATE THEN 'Expired'
           WHEN t.lease_end <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
           ELSE 'Active'
         END                 AS "Lease Status",
         (t.monthly_rent * 12) AS "Annual Rent"
       FROM tenants t
       LEFT JOIN properties p ON p.id = t.property_id
       WHERE t.is_active = TRUE
       ORDER BY p.name, t.name`
    );
    console.log("Success! Rows:", rows.length);
  } catch (err) {
    console.error("SQL Error:", err);
  } finally {
    pool.end();
  }
}
run();
