import pool from '../config/db.js';

export async function getKPIs() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  let targetM = now.getMonth() + 1; // 1-12
  let targetY = now.getFullYear();

  const currentMonthStr = `${months[targetM - 1]}-${targetY}`;

  const [kpiRes, occupancyRes, receiptRes] = await Promise.all([
    pool.query(
      `SELECT
         -- current month billed
         COALESCE(SUM(bill_amount)
           FILTER (WHERE EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS monthly_billed,
         COALESCE(SUM(bill_amount)
           FILTER (WHERE category ILIKE '%rent%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS rent_billed,
         COALESCE(SUM(amount_collected)
           FILTER (WHERE category ILIKE '%rent%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS rent_collected,
         COALESCE(SUM(bill_amount)
           FILTER (WHERE category ILIKE '%power%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS power_billed,
         COALESCE(SUM(amount_collected)
           FILTER (WHERE category ILIKE '%power%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS power_collected,
         COALESCE(SUM(bill_amount)
           FILTER (WHERE category ILIKE '%water%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS water_billed,
         COALESCE(SUM(amount_collected)
           FILTER (WHERE category ILIKE '%water%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS water_collected,
         COALESCE(SUM(bill_amount)
           FILTER (WHERE category ILIKE '%infra%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS infra_billed,
         COALESCE(SUM(amount_collected)
           FILTER (WHERE category ILIKE '%infra%' AND EXTRACT(MONTH FROM bill_date) = $1 AND EXTRACT(YEAR FROM bill_date) = $2), 0) AS infra_collected,
         -- all time outstanding
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE status <> 'Paid'), 0) AS total_outstanding,
         -- overdue > 30 days
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE (CURRENT_DATE - due_date) > 30 AND status <> 'Paid'), 0) AS overdue_30_plus,
         -- annual rent roll (Rent & CAM, current FYTD starting April 1st)
         COALESCE(SUM(amount_collected)
           FILTER (WHERE category ILIKE '%rent%'
             AND bill_date >= date_trunc('year', CURRENT_DATE - INTERVAL '3 months') + INTERVAL '3 months'
           ), 0) AS annual_rent_roll
       FROM invoices`,
      [targetM, targetY]
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total_tenants,
         COUNT(*) FILTER (WHERE is_active = TRUE) AS active_tenants
       FROM tenants`
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS monthly_collected
       FROM receipts
       WHERE EXTRACT(MONTH FROM payment_date) = $1 AND EXTRACT(YEAR FROM payment_date) = $2`,
      [targetM, targetY]
    )
  ]);

  const kpi   = kpiRes.rows[0];
  const occ   = occupancyRes.rows[0];
  const rec   = receiptRes.rows[0];

  const totalUnits  = await pool.query(`SELECT COALESCE(SUM(total_units),0) AS units FROM properties WHERE is_active=TRUE`);
  const units       = parseInt(totalUnits.rows[0].units) || 0;
  const activeTen   = parseInt(occ.active_tenants) || 0;
  const occupancy   = units > 0 ? ((activeTen / units) * 100).toFixed(1) : 0;

  return {
    billing_month:      currentMonthStr,
    monthly_billed:     parseFloat(kpi.monthly_billed),
    monthly_collected:  parseFloat(rec.monthly_collected),
    total_outstanding:  parseFloat(kpi.total_outstanding),
    overdue_30_plus:    parseFloat(kpi.overdue_30_plus),
    occupancy_rate:     occupancy,
    annual_rent_roll:   parseFloat(kpi.annual_rent_roll),
    total_tenants:      parseInt(occ.total_tenants),
    active_tenants:     activeTen,
    total_units:        units,
    rent_billed:        parseFloat(kpi.rent_billed),
    rent_collected:     parseFloat(kpi.rent_collected),
    power_billed:       parseFloat(kpi.power_billed),
    power_collected:    parseFloat(kpi.power_collected),
    water_billed:       parseFloat(kpi.water_billed),
    water_collected:    parseFloat(kpi.water_collected),
    infra_billed:       parseFloat(kpi.infra_billed),
    infra_collected:    parseFloat(kpi.infra_collected),
  };
}

export async function getAgingSnapshot() {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(outstanding_balance), 0) AS total,
       COALESCE(SUM(outstanding_balance) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = 'Current'
       ), 0) AS current_amt,
       COALESCE(SUM(outstanding_balance) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '1-30 Days'
       ), 0) AS days_1_30,
       COALESCE(SUM(outstanding_balance) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '31-60 Days'
       ), 0) AS days_31_60,
       COALESCE(SUM(outstanding_balance) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '61-90 Days'
       ), 0) AS days_61_90,
       COALESCE(SUM(outstanding_balance) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '90+ Days'
       ), 0) AS days_90_plus,
       COUNT(*) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = 'Current'
       ) AS current_count,
       COUNT(*) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '1-30 Days'
       ) AS days_1_30_count,
       COUNT(*) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '31-60 Days'
       ) AS days_31_60_count,
       COUNT(*) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '61-90 Days'
       ) AS days_61_90_count,
       COUNT(*) FILTER (
         WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '90+ Days'
       ) AS days_90_plus_count
     FROM invoices
     WHERE outstanding_balance > 0`
  );
  return rows[0];
}

export async function getTenantSummary() {
  const { rows } = await pool.query(
    `SELECT
       i.tenant_name,
       i.property_name,
       i.category,
       t.unit_no,
       t.phone                                           AS tenant_phone,
       COUNT(*)                                          AS invoice_count,
       COALESCE(SUM(i.bill_amount),         0)           AS total_billed,
       COALESCE(SUM(i.amount_collected),    0)           AS total_collected,
       COALESCE(SUM(i.outstanding_balance), 0)           AS total_outstanding,
       -- live overdue days
       MAX(GREATEST(0, CURRENT_DATE - i.due_date))       AS max_overdue_days,
       -- worst aging using live function
       CASE MAX(
         CASE compute_aging_bucket(i.due_date, i.amount_collected, i.bill_amount)
           WHEN '90+ Days'   THEN 5
           WHEN '61-90 Days' THEN 4
           WHEN '31-60 Days' THEN 3
           WHEN '1-30 Days'  THEN 2
           WHEN 'Current'    THEN 1
           ELSE 0
         END
       )
         WHEN 5 THEN '90+ Days'
         WHEN 4 THEN '61-90 Days'
         WHEN 3 THEN '31-60 Days'
         WHEN 2 THEN '1-30 Days'
         WHEN 1 THEN 'Current'
         ELSE 'Current'
       END                                               AS worst_aging,
       ROUND(
         CASE WHEN SUM(i.bill_amount) > 0
           THEN (SUM(i.amount_collected) / SUM(i.bill_amount)) * 100
           ELSE 0
         END, 1
       )                                                 AS collection_pct
     FROM invoices i
     LEFT JOIN tenants t ON t.id = i.tenant_id
     GROUP BY i.tenant_name, i.property_name, i.category, t.unit_no, t.phone
     ORDER BY total_outstanding DESC, max_overdue_days DESC
     LIMIT 20`
  );
  return rows;
}

export async function getDashboardAlerts() {
  const [overdueRes, expiryRes, escalationRes, noCollectionRes] = await Promise.all([

    // Query 1 — overdue tenants (LIVE)
    pool.query(
      `SELECT
         tenant_name,
         property_name,
         SUM(outstanding_balance)                    AS amount,
         MAX(GREATEST(0, CURRENT_DATE - due_date))   AS overdue_days,
         COUNT(*)                                    AS invoice_count
       FROM invoices
       WHERE outstanding_balance > 0
         AND due_date < CURRENT_DATE
       GROUP BY tenant_name, property_name
       ORDER BY overdue_days DESC
       LIMIT 5`
    ),

    // Query 2 — leases expiring in 60 days (unchanged)
    pool.query(
      `SELECT
         t.name  AS tenant_name,
         p.name  AS property_name,
         t.lease_end,
         (t.lease_end - CURRENT_DATE) AS days_left
       FROM tenants t
       LEFT JOIN properties p ON p.id = t.property_id
       WHERE t.lease_end IS NOT NULL
         AND t.is_active = TRUE
         AND t.lease_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
       ORDER BY t.lease_end ASC
       LIMIT 5`
    ),

    // Query 3 — critical 60d+ overdue (LIVE)
    pool.query(
      `SELECT
         tenant_name,
         property_name,
         billing_month,
         bill_amount,
         outstanding_balance,
         GREATEST(0, CURRENT_DATE - due_date) AS overdue_by_days
       FROM invoices
       WHERE outstanding_balance > 0
         AND (CURRENT_DATE - due_date) > 60
       ORDER BY (CURRENT_DATE - due_date) DESC
       LIMIT 5`
    ),

    // Query 4 — zero payment 30d+ overdue (LIVE)
    pool.query(
      `SELECT
         tenant_name,
         property_name,
         COUNT(*)                                  AS invoice_count,
         SUM(outstanding_balance)                  AS amount,
         MAX(GREATEST(0, CURRENT_DATE - due_date)) AS overdue_days
       FROM invoices
       WHERE outstanding_balance > 0
         AND amount_collected   = 0
         AND (CURRENT_DATE - due_date) > 30
       GROUP BY tenant_name, property_name
       ORDER BY overdue_days DESC
       LIMIT 5`
    ),
  ]);

  return {
    overdue:      overdueRes.rows,
    leaseExpiry:  expiryRes.rows,
    critical:     escalationRes.rows,
    noCollection: noCollectionRes.rows,
  };
}

export async function getRecentActivity() {
  const [recentInvoices, recentReceipts] = await Promise.all([
    pool.query(
      `SELECT
         id, tenant_name, property_name,
         bill_amount, billing_month, status, created_at
       FROM invoices
       ORDER BY created_at DESC LIMIT 5`
    ),
    pool.query(
      `SELECT
         r.id, r.amount, r.payment_date, r.payment_mode, r.created_at,
         i.tenant_name, i.property_name, i.billing_month
       FROM receipts r
       JOIN invoices i ON i.id = r.invoice_id
       ORDER BY r.created_at DESC LIMIT 5`
    ),
  ]);
  return {
    recentInvoices:  recentInvoices.rows,
    recentReceipts:  recentReceipts.rows,
  };
}