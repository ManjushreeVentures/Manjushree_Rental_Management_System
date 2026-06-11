import pool from '../config/db.js';
import * as XLSX from 'xlsx';

// ─── helpers ──────────────────────────────────────────────────────────────────
function toFloat(v) { return parseFloat(v) || 0; }

function buildXlsx(sheets) {
  // sheets: [{ name, rows }]
  const wb = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function sendXlsx(res, filename, sheets) {
  const buf = buildXlsx(sheets);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

// ─── GET /reports/outstanding ─────────────────────────────────────────────────
export async function outstandingReport(req, res) {
  const { property_name, aging_bucket, format = 'json' } = req.query;
  const params = [];
  let where    = `WHERE i.outstanding_balance > 0`;

  if (property_name) { params.push(property_name); where += ` AND i.property_name = $${params.length}`; }
  if (aging_bucket)  { params.push(aging_bucket);  where += ` AND i.aging_bucket  = $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT
       i.property_name   AS "Location",
       i.tenant_name     AS "Tenant Name",
       t.unit_no         AS "Unit No",
       t.gstin           AS "GSTIN",
       i.category        AS "Category",
       i.billing_month   AS "Billing Month",
       i.bill_date       AS "Bill Date",
       i.bill_amount     AS "Bill Amount",
       i.due_date        AS "Due Date",
       i.credit_terms_days AS "Credit Terms (Days)",
       i.amount_collected  AS "Amount Collected",
       i.outstanding_balance AS "Outstanding Balance",
       i.overdue_by_days   AS "Overdue By Days",
       i.aging_bucket      AS "Aging Bucket",
       i.status            AS "Status"
     FROM invoices i
     LEFT JOIN tenants t ON t.id = i.tenant_id
     ${where}
     ORDER BY i.overdue_by_days DESC, i.outstanding_balance DESC`,
    params
  );

  if (format === 'xlsx') {
    return sendXlsx(res, 'Outstanding_Report.xlsx', [{ name: 'Outstanding', rows }]);
  }
  res.json({ success: true, data: rows, total: rows.length });
}

// ─── GET /reports/collection-summary ──────────────────────────────────────────
export async function collectionSummary(req, res) {
  const { format = 'json' } = req.query;

  const [byMonthRes, byPropertyRes, byModeRes] = await Promise.all([
    pool.query(
      `SELECT
         billing_month                              AS "Billing Month",
         COUNT(*)                                   AS "Invoices",
         COALESCE(SUM(bill_amount),         0)      AS "Total Billed",
         COALESCE(SUM(amount_collected),    0)      AS "Total Collected",
         COALESCE(SUM(outstanding_balance), 0)      AS "Outstanding",
         ROUND(
           CASE WHEN SUM(bill_amount) > 0
             THEN (SUM(amount_collected)/SUM(bill_amount))*100
             ELSE 0 END, 1
         )                                          AS "Collection %"
       FROM invoices
       WHERE billing_month IS NOT NULL AND billing_month <> ''
       GROUP BY billing_month
       ORDER BY MIN(bill_date) DESC`
    ),
    pool.query(
      `SELECT
         property_name                              AS "Property",
         COUNT(DISTINCT tenant_name)                AS "Tenants",
         COUNT(*)                                   AS "Invoices",
         COALESCE(SUM(bill_amount),         0)      AS "Total Billed",
         COALESCE(SUM(amount_collected),    0)      AS "Collected",
         COALESCE(SUM(outstanding_balance), 0)      AS "Outstanding",
         ROUND(
           CASE WHEN SUM(bill_amount) > 0
             THEN (SUM(amount_collected)/SUM(bill_amount))*100
             ELSE 0 END, 1
         )                                          AS "Collection %"
       FROM invoices
       GROUP BY property_name
       ORDER BY SUM(bill_amount) DESC`
    ),
    pool.query(
      `SELECT
         payment_mode                               AS "Payment Mode",
         COUNT(*)                                   AS "Receipts",
         COALESCE(SUM(amount), 0)                   AS "Total Amount"
       FROM receipts
       GROUP BY payment_mode
       ORDER BY SUM(amount) DESC`
    ),
  ]);

  if (format === 'xlsx') {
    return sendXlsx(res, 'Collection_Summary.xlsx', [
      { name: 'By Month',    rows: byMonthRes.rows    },
      { name: 'By Property', rows: byPropertyRes.rows },
      { name: 'By Mode',     rows: byModeRes.rows     },
    ]);
  }

  res.json({
    success: true,
    data: {
      byMonth:    byMonthRes.rows,
      byProperty: byPropertyRes.rows,
      byMode:     byModeRes.rows,
    },
  });
}

// ─── GET /reports/aging-detail ─────────────────────────────────────────────────
export async function agingDetail(req, res) {
  const { format = 'json' } = req.query;

  const [summaryRes, detailRes] = await Promise.all([
    pool.query(
      `SELECT
         property_name                              AS "Property",
         COUNT(DISTINCT tenant_name)                AS "Tenants",
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE aging_bucket='Current'),   0) AS "Current",
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE aging_bucket='1-30 Days'), 0) AS "1-30 Days",
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE aging_bucket='31-60 Days'),0) AS "31-60 Days",
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE aging_bucket='61-90 Days'),0) AS "61-90 Days",
         COALESCE(SUM(outstanding_balance)
           FILTER (WHERE aging_bucket='90+ Days'),  0) AS "90+ Days",
         COALESCE(SUM(outstanding_balance),         0) AS "Total Outstanding"
       FROM invoices
       WHERE outstanding_balance > 0
       GROUP BY property_name
       ORDER BY SUM(outstanding_balance) DESC`
    ),
    pool.query(
      `SELECT
         i.property_name   AS "Property",
         i.tenant_name     AS "Tenant",
         t.unit_no         AS "Unit",
         i.category        AS "Category",
         i.billing_month   AS "Billing Month",
         i.bill_amount     AS "Bill Amount",
         i.outstanding_balance AS "Outstanding",
         i.due_date        AS "Due Date",
         i.overdue_by_days AS "Overdue Days",
         i.aging_bucket    AS "Aging Bucket"
       FROM invoices i
       LEFT JOIN tenants t ON t.id = i.tenant_id
       WHERE i.outstanding_balance > 0
       ORDER BY i.overdue_by_days DESC, i.outstanding_balance DESC`
    ),
  ]);

  if (format === 'xlsx') {
    return sendXlsx(res, 'Aging_Detail.xlsx', [
      { name: 'Summary by Property', rows: summaryRes.rows },
      { name: 'Detail',              rows: detailRes.rows  },
    ]);
  }

  res.json({
    success: true,
    data: {
      summary: summaryRes.rows,
      detail:  detailRes.rows,
    },
  });
}

// ─── GET /reports/tenant-ledger ────────────────────────────────────────────────
export async function tenantLedger(req, res) {
  const { tenant_name, format = 'json' } = req.query;
  if (!tenant_name)
    return res.status(400).json({ success: false, message: 'tenant_name is required' });

  const [invoicesRes, receiptsRes] = await Promise.all([
    pool.query(
      `SELECT
         i.bill_date       AS "Date",
         'Invoice'         AS "Type",
         i.category        AS "Category",
         i.billing_month   AS "Billing Month",
         i.bill_amount     AS "Debit",
         0                 AS "Credit",
         i.status          AS "Status",
         i.aging_bucket    AS "Aging"
       FROM invoices i
       WHERE i.tenant_name = $1
       ORDER BY i.bill_date DESC`,
      [tenant_name]
    ),
    pool.query(
      `SELECT
         r.payment_date    AS "Date",
         'Receipt'         AS "Type",
         r.payment_mode    AS "Category",
         i.billing_month   AS "Billing Month",
         0                 AS "Debit",
         r.amount          AS "Credit",
         r.reference_no    AS "Status",
         ''                AS "Aging"
       FROM receipts r
       JOIN invoices i ON i.id = r.invoice_id
       WHERE i.tenant_name = $1
       ORDER BY r.payment_date DESC`,
      [tenant_name]
    ),
  ]);

  const rows = [...invoicesRes.rows, ...receiptsRes.rows]
    .sort((a, b) => new Date(b.Date) - new Date(a.Date));

  if (format === 'xlsx') {
    return sendXlsx(res, `Ledger_${tenant_name.replace(/\s+/g, '_')}.xlsx`, [
      { name: 'Ledger', rows },
    ]);
  }

  res.json({ success: true, data: rows });
}

// ─── GET /reports/rent-roll ────────────────────────────────────────────────────
export async function rentRoll(req, res) {
  const { format = 'json' } = req.query;

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
       (t.lease_end::DATE - CURRENT_DATE) AS "Days to Expiry",
       CASE
         WHEN t.lease_end::DATE < CURRENT_DATE THEN 'Expired'
         WHEN t.lease_end::DATE <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
         ELSE 'Active'
       END                 AS "Lease Status",
       (COALESCE(t.monthly_rent, 0)::NUMERIC * 12) AS "Annual Rent"
     FROM tenants t
     LEFT JOIN properties p ON p.id = t.property_id
     WHERE t.is_active = TRUE
     ORDER BY p.name, t.name`
  );

  if (format === 'xlsx') {
    return sendXlsx(res, 'Rent_Roll.xlsx', [{ name: 'Rent Roll', rows }]);
  }
  res.json({ success: true, data: rows });
}