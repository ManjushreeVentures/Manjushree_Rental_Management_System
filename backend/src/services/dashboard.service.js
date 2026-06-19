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
       FROM invoices
       WHERE property_name IS DISTINCT FROM 'Internal'`,
      [targetM, targetY]
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total_tenants,
         COUNT(*) FILTER (WHERE is_active = TRUE) AS active_tenants,
         COALESCE(SUM(monthly_rent) FILTER (WHERE is_active = TRUE), 0) AS total_monthly_rent
       FROM tenants
       WHERE property_id NOT IN (SELECT id FROM properties WHERE name = 'Internal') OR property_id IS NULL`
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS monthly_collected
       FROM receipts
       WHERE EXTRACT(MONTH FROM payment_date) = $1 AND EXTRACT(YEAR FROM payment_date) = $2
       AND invoice_id IN (SELECT id FROM invoices WHERE property_name IS DISTINCT FROM 'Internal')`,
      [targetM, targetY]
    )
  ]);

  const kpi   = kpiRes.rows[0];
  const occ   = occupancyRes.rows[0];
  const rec   = receiptRes.rows[0];

  const propertiesResult = await pool.query(`SELECT * FROM properties WHERE is_active=TRUE AND name IS DISTINCT FROM 'Internal'`);
  const propertiesRows = propertiesResult.rows;
  const allUnitsResult = await pool.query(`SELECT property_id, total_area, tenant_id, rent_amount FROM units WHERE is_active = true`);
  const allUnits = allUnitsResult.rows;

  const tenantsResult = await pool.query(`SELECT property_id, SUM(tenant_area) as leased_area, SUM(COALESCE(monthly_rent, 0) + COALESCE(cam_amount, 0)) as total_rent FROM tenants WHERE is_active = true GROUP BY property_id`);
  const tenantSums = tenantsResult.rows;

  let totalArea = 0;
  let leasedArea = 0;
  let vacantArea = 0;
  let totalPropertiesAmount = 0;
  let units = 0;

  for (const property of propertiesRows) {
    units += Number(property.total_units) || 0;
    const propertyUnits = allUnits.filter(u => u.property_id === property.id);
    
    if (propertyUnits.length > 0) {
      let calcTotalArea = 0;
      let calcLeasedArea = 0;
      let calcVacantArea = 0;
      let calcTotalAmount = 0;

      for (const u of propertyUnits) {
        const area = Number(u.total_area) || 0;
        const rent = Number(u.rent_amount) || 0;
        
        calcTotalArea += area;
        if (u.tenant_id) {
          calcLeasedArea += area;
          calcTotalAmount += rent;
        } else {
          calcVacantArea += area;
        }
      }

      // If the defined units' area is less than the property's total area, the rest is vacant
      const propertyTotalArea = Number(property.total_area) || 0;
      if (propertyTotalArea > calcTotalArea) {
        calcVacantArea += (propertyTotalArea - calcTotalArea);
        calcTotalArea = propertyTotalArea;
      }

      totalArea += calcTotalArea;
      leasedArea += calcLeasedArea;
      vacantArea += calcVacantArea;
      totalPropertiesAmount += calcTotalAmount;
    } else {
      const tSum = tenantSums.find(t => t.property_id === property.id);
      const tLeased = tSum ? (Number(tSum.leased_area) || 0) : 0;
      const tRent = tSum ? (Number(tSum.total_rent) || 0) : 0;
      
      const pTotalArea = Math.max(Number(property.total_area) || 0, tLeased);
      const pVacantArea = Math.max(0, pTotalArea - tLeased);

      totalArea += pTotalArea;
      leasedArea += tLeased;
      vacantArea += pVacantArea;
      totalPropertiesAmount += tRent;
    }
  }

  const totalProperties = propertiesRows.length;

  const activeTen   = parseInt(occ.active_tenants) || 0;
  // Use area-based occupancy if totalArea > 0, else unit-based
  let occupancy = 0;
  if (totalArea > 0) {
    occupancy = ((leasedArea / totalArea) * 100).toFixed(1);
  } else if (units > 0) {
    occupancy = ((activeTen / units) * 100).toFixed(1);
  }

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
    total_properties:   totalProperties,
    total_area:         totalArea,
    leased_area:        leasedArea,
    vacant_area:        vacantArea,
    total_property_rent: totalPropertiesAmount || 0,
    total_monthly_rent: parseFloat(occ.total_monthly_rent),
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
     WHERE outstanding_balance > 0 AND property_name IS DISTINCT FROM 'Internal'`
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
     WHERE i.property_name IS DISTINCT FROM 'Internal'
     GROUP BY i.tenant_name, i.property_name, i.category, t.unit_no, t.phone
     ORDER BY total_outstanding DESC, max_overdue_days DESC
     LIMIT 20`
  );
  return rows;
}

export async function getPropertySummary() {
  const { rows } = await pool.query(
    `SELECT
       p.name AS property_name,
       COUNT(DISTINCT t.id) AS tenant_count,
       COALESCE(SUM(i.bill_amount), 0) AS total_billed,
       COALESCE(SUM(i.amount_collected), 0) AS total_collected,
       COALESCE(SUM(i.outstanding_balance), 0) AS total_outstanding,
       ROUND(
         CASE WHEN SUM(i.bill_amount) > 0
           THEN (SUM(i.amount_collected) / SUM(i.bill_amount)) * 100
           ELSE 0
         END, 1
       ) AS collection_pct
     FROM properties p
     LEFT JOIN tenants t ON t.property_id = p.id AND t.is_active = TRUE
     LEFT JOIN invoices i ON i.property_id = p.id
     WHERE p.name IS DISTINCT FROM 'Internal' AND p.is_active = TRUE
     GROUP BY p.name
     ORDER BY total_outstanding DESC, p.name ASC`
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
         AND property_name IS DISTINCT FROM 'Internal'
       GROUP BY tenant_name, property_name
       ORDER BY overdue_days DESC
       LIMIT 5`
    ),

    // Query 2 — leases expiring in 60 days (unchanged)
    pool.query(
      `SELECT
         t.name  AS tenant_name,
         p.name  AS property_name,
         (t.lease_start + (t.leased_period * INTERVAL '1 month'))::date AS lease_end,
         ((t.lease_start + (t.leased_period * INTERVAL '1 month'))::date - CURRENT_DATE) AS days_left
       FROM tenants t
       LEFT JOIN properties p ON p.id = t.property_id
       WHERE t.leased_period IS NOT NULL AND t.lease_start IS NOT NULL
         AND t.is_active = TRUE
         AND (p.name IS DISTINCT FROM 'Internal')
         AND (t.lease_start + (t.leased_period * INTERVAL '1 month')) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
       ORDER BY (t.lease_start + (t.leased_period * INTERVAL '1 month')) ASC
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
         AND property_name IS DISTINCT FROM 'Internal'
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
         AND property_name IS DISTINCT FROM 'Internal'
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