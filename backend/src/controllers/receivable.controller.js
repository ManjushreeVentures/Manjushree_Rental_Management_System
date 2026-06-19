import pool from '../config/db.js';

export async function getAgingSummary(req, res) {
  // CLEAN DB OF NaN VALUES
  try {
    await pool.query(`UPDATE invoices SET bill_amount = 0 WHERE bill_amount IS NULL OR bill_amount::text = 'NaN' OR bill_amount::text = 'null'`);
    await pool.query(`UPDATE invoices SET outstanding_balance = 0 WHERE outstanding_balance IS NULL OR outstanding_balance::text = 'NaN' OR outstanding_balance::text = 'null'`);
  } catch (e) {
    console.error('NaN cleanup failed', e);
  }

  const { property_name } = req.query;
  const params = [];
  let where = `WHERE outstanding_balance > 0`;

  if (property_name) {
    params.push(property_name);
    where += ` AND property_name = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(outstanding_balance), 0) AS total_outstanding,
       -- live recalculated buckets
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
     FROM invoices ${where}`,
    params
  );
  res.json({ success: true, data: rows[0] });
}

export async function getOutstandingRegister(req, res) {
  const {
    search, aging_bucket, property_name,
    category, page = 1, limit = 50,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where = `WHERE i.outstanding_balance > 0`;

  const add = (clause, value) => {
    params.push(value);
    where += ` AND ${clause.replace('?', `$${params.length}`)}`;
  };

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (
      i.tenant_name   ILIKE $${params.length} OR
      i.property_name ILIKE $${params.length}
    )`;
  }
  if (property_name) add('i.property_name = ?', property_name);
  if (category)      add('i.category = ?',      category);

  // aging_bucket filter uses live calculation
  if (aging_bucket) {
    params.push(aging_bucket);
    where += ` AND compute_aging_bucket(i.due_date, i.amount_collected, i.bill_amount) = $${params.length}`;
  }

  const dataQuery = `
    SELECT
      i.id,
      i.tenant_id,
      i.tenant_name,
      i.property_name,
      i.category,
      i.billing_month,
      i.bill_date,
      i.due_date,
      i.bill_amount,
      i.amount_collected,
      i.outstanding_balance,
      -- live recalculated fields
      GREATEST(0, CURRENT_DATE - i.due_date)                              AS overdue_by_days,
      compute_aging_bucket(i.due_date, i.amount_collected, i.bill_amount) AS aging_bucket,
      i.status,
      t.unit_no   AS tenant_unit,
      t.phone     AS tenant_phone,
      t.email     AS tenant_email
    FROM invoices i
    LEFT JOIN tenants t ON t.id = i.tenant_id
    ${where}
    ORDER BY
      GREATEST(0, CURRENT_DATE - i.due_date) DESC,
      i.outstanding_balance DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) FROM invoices i ${where}`;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQuery,  [...params, parseInt(limit), offset]),
    pool.query(countQuery,  params),
  ]);

  res.json({
    success: true,
    data: dataRes.rows,
    meta: {
      total: parseInt(countRes.rows[0].count),
      page:  parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countRes.rows[0].count / parseInt(limit)),
    },
  });
}

// ─── GET /receivables/tenant/:tenantId ──────────────────────────────────────
export async function getTenantOutstanding(req, res) {
  const tenantId = req.params.tenantId;

  const [summaryRes, invoicesRes] = await Promise.all([
    pool.query(
      `SELECT
         tenant_id,
         tenant_name,
         COUNT(*)                               AS total_invoices,
         COALESCE(SUM(bill_amount),         0)  AS total_billed,
         COALESCE(SUM(amount_collected),    0)  AS total_collected,
         COALESCE(SUM(outstanding_balance), 0)  AS total_outstanding,
         MAX(overdue_by_days)                   AS max_overdue_days,
         MIN(due_date)                          AS oldest_due_date
       FROM invoices
       WHERE tenant_id = $1
       GROUP BY tenant_id, tenant_name`,
      [tenantId]
    ),
    pool.query(
      `SELECT
         i.*,
         t.phone AS tenant_phone,
         t.email AS tenant_email,
         t.gstin AS tenant_gstin,
         t.unit_no
       FROM invoices i
       LEFT JOIN tenants t ON t.id = i.tenant_id
       WHERE i.tenant_id = $1
       ORDER BY i.bill_date DESC`,
      [tenantId]
    ),
  ]);

  res.json({
    success: true,
    data: {
      summary:  summaryRes.rows[0] ?? null,
      invoices: invoicesRes.rows,
    },
  });
}

// ─── GET /receivables/alerts ──────────────────────────────────────────────────
export async function getOverdueAlerts(req, res) {
  const [overdueRes, expiryRes, escalationRes] = await Promise.all([
    // overdue invoices grouped by tenant
   // overdue invoices grouped by tenant — LIVE calculation
pool.query(
  `SELECT
     tenant_id,
     tenant_name,
     property_name,
     COUNT(*)                                      AS invoice_count,
     SUM(outstanding_balance)                      AS total_overdue,
     MAX(GREATEST(0, CURRENT_DATE - due_date))     AS max_overdue_days,
     MIN(due_date)                                 AS oldest_due
   FROM invoices
   WHERE outstanding_balance > 0
     AND due_date < CURRENT_DATE
   GROUP BY tenant_id, tenant_name, property_name
   ORDER BY max_overdue_days DESC, total_overdue DESC
   LIMIT 20`
),
    // leases expiring in 60 days
    pool.query(
      `SELECT
         t.id           AS tenant_id,
         t.name         AS tenant_name,
         p.name         AS property_name,
         t.lease_end,
         t.monthly_rent,
         (t.lease_end - CURRENT_DATE) AS days_to_expiry
       FROM tenants t
       LEFT JOIN properties p ON p.id = t.property_id
       WHERE t.lease_end IS NOT NULL
         AND t.lease_end >= CURRENT_DATE
         AND t.lease_end <= CURRENT_DATE + INTERVAL '60 days'
         AND t.is_active = TRUE
       ORDER BY t.lease_end ASC`
    ),
    // invoices with no collection for 30+ days past due
  // invoices with no collection for 30+ days past due — LIVE calculation
pool.query(
  `SELECT
     tenant_id,
     tenant_name,
     property_name,
     COUNT(*)                                    AS invoice_count,
     SUM(outstanding_balance)                    AS total_amount,
     MAX(GREATEST(0, CURRENT_DATE - due_date))   AS overdue_days
   FROM invoices
   WHERE outstanding_balance > 0
     AND (CURRENT_DATE - due_date) > 30
     AND amount_collected = 0
   GROUP BY tenant_id, tenant_name, property_name
   ORDER BY overdue_days DESC
   LIMIT 10`
),
  ]);

  res.json({
    success: true,
    data: {
      overdueByTenant:  overdueRes.rows,
      leasesExpiring:   expiryRes.rows,
      noPayment30Plus:  escalationRes.rows,
    },
  });
}

// ─── GET /receivables/trend ───────────────────────────────────────────────────
export async function getCollectionTrend(req, res) {
  const { rows } = await pool.query(
    `SELECT
       billing_month,
       COALESCE(SUM(bill_amount),         0) AS billed,
       COALESCE(SUM(amount_collected),    0) AS collected,
       COALESCE(SUM(outstanding_balance), 0) AS outstanding,
       COUNT(*)                              AS invoice_count,
       ROUND(
         CASE WHEN SUM(bill_amount) > 0
           THEN (SUM(amount_collected) / SUM(bill_amount)) * 100
           ELSE 0
         END, 1
       )                                     AS collection_pct
     FROM invoices
     WHERE billing_month IS NOT NULL
       AND billing_month <> ''
     GROUP BY billing_month
     ORDER BY MIN(bill_date) DESC
     LIMIT 12`
  );
  res.json({ success: true, data: rows });
}