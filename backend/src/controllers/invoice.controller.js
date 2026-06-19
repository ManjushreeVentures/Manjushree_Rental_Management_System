import pool from '../config/db.js';
import { logAudit } from '../services/audit.service.js';
import { sendReminderEmail, generateReminderContent } from '../utils/mailer.js';

// ─── GET /invoices ────────────────────────────────────────────────────────────
export async function getAllInvoices(req, res) {
  const {
    search, status, aging_bucket, billing_month,
    property_name, tenant_id, category,
    page = 1, limit = 50,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where = 'WHERE 1=1';

  const add = (clause, value) => {
    params.push(value);
    where += ` AND ${clause.replace('?', `$${params.length}`)}`;
  };

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (i.tenant_name ILIKE $${params.length}
                 OR i.property_name ILIKE $${params.length}
                 OR i.category ILIKE $${params.length})`;
  }
  if (status) {
    if (status.includes(',')) {
      add('i.status = ANY(?)', status.split(','));
    } else {
      add('i.status = ?', status);
    }
  }
  if (aging_bucket) {
    params.push(aging_bucket);
    where += ` AND compute_aging_bucket(i.due_date, i.amount_collected, i.bill_amount) = $${params.length}`;
  }
  if (billing_month) add('i.billing_month = ?', billing_month);
  if (property_name) add('i.property_name = ?', property_name);
  if (tenant_id) add('i.tenant_id = ?', tenant_id);
  if (category) add('i.category = ?', category);

  const dataQuery = `
    SELECT
      i.*,
      compute_aging_bucket(i.due_date, i.amount_collected, i.bill_amount) AS aging_bucket,
      p.city          AS property_city,
      t.unit_no       AS tenant_unit,
      t.phone         AS tenant_phone,
      t.lease_end     AS tenant_lease_end
    FROM invoices i
    LEFT JOIN properties p ON p.id = i.property_id
    LEFT JOIN tenants     t ON t.id = i.tenant_id
    ${where}
    ORDER BY i.bill_date DESC, i.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `SELECT COUNT(*) FROM invoices i ${where}`;

  const [dataRes, countRes] = await Promise.all([
    pool.query(dataQuery, [...params, parseInt(limit), offset]),
    pool.query(countQuery, params),
  ]);

  res.json({
    success: true,
    data: dataRes.rows,
    meta: {
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countRes.rows[0].count / parseInt(limit)),
    },
  });
}

// ─── GET /invoices/:id ────────────────────────────────────────────────────────
export async function getInvoiceById(req, res) {
  const { rows } = await pool.query(
    `SELECT
       i.*,
       p.city    AS property_city,
       p.address AS property_address,
       t.unit_no AS tenant_unit,
       t.phone   AS tenant_phone,
       t.email   AS tenant_email,
       t.gstin   AS tenant_gstin,
       -- receipts against this invoice
       COALESCE(
         json_agg(
           json_build_object(
             'id',           r.id,
             'amount',       r.amount,
             'payment_date', r.payment_date,
             'payment_mode', r.payment_mode,
             'reference_no', r.reference_no,
             'remarks',      r.remarks
           ) ORDER BY r.payment_date DESC
         ) FILTER (WHERE r.id IS NOT NULL),
         '[]'
       ) AS receipts
     FROM invoices i
     LEFT JOIN properties p ON p.id = i.property_id
     LEFT JOIN tenants     t ON t.id = i.tenant_id
     LEFT JOIN receipts    r ON r.invoice_id = i.id
     WHERE i.id = $1
     GROUP BY i.id, p.city, p.address, t.unit_no, t.phone, t.email, t.gstin`,
    [req.params.id]
  );
  if (!rows.length)
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: rows[0] });
}

// ─── GET /invoices/stats ──────────────────────────────────────────────────────
export async function getInvoiceStats(req, res) {
  const { billing_month } = req.query;
  const params = [];
  let where = '';
  if (billing_month) {
    params.push(billing_month);
    where = `WHERE billing_month = $1`;
  }

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                            AS total_invoices,
       COALESCE(SUM(bill_amount),         0)              AS total_billed,
       COALESCE(SUM(amount_collected),    0)              AS total_collected,
       COALESCE(SUM(outstanding_balance), 0)              AS total_outstanding,
       COUNT(*) FILTER (WHERE status = 'Paid')            AS paid_count,
       COUNT(*) FILTER (WHERE status = 'Pending')         AS pending_count,
       COUNT(*) FILTER (WHERE status = 'Partial')         AS partial_count,
       COALESCE(SUM(outstanding_balance)
         FILTER (WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = 'Current'),    0)   AS aging_current,
       COALESCE(SUM(outstanding_balance)
         FILTER (WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '1-30 Days'),  0)   AS aging_1_30,
       COALESCE(SUM(outstanding_balance)
         FILTER (WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '31-60 Days'), 0)   AS aging_31_60,
       COALESCE(SUM(outstanding_balance)
         FILTER (WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '61-90 Days'), 0)   AS aging_61_90,
       COALESCE(SUM(outstanding_balance)
         FILTER (WHERE compute_aging_bucket(due_date, amount_collected, bill_amount) = '90+ Days'),   0)   AS aging_90_plus
     FROM invoices ${where}`,
    params
  );
  res.json({ success: true, data: rows[0] });
}

// ─── GET /invoices/billing-months ─────────────────────────────────────────────
export async function getBillingMonths(req, res) {
  const { rows } = await pool.query(
    `SELECT DISTINCT billing_month
     FROM invoices
     WHERE billing_month IS NOT NULL AND billing_month <> ''`
  );

  const monthsMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const parsed = rows.map((r) => {
    let text = r.billing_month;
    let d = new Date(0); // fallback
    if (text && text.length > 15 && text.includes('GMT')) {
      const parsedDate = new Date(text);
      if (!isNaN(parsedDate)) d = parsedDate;
    } else if (text && text.includes('-')) {
      const [m, y] = text.split('-');
      if (y && monthsMap[m] !== undefined) {
        d = new Date(parseInt(y), monthsMap[m], 1);
      }
    }
    return { text, d };
  });

  parsed.sort((a, b) => b.d - a.d);

  res.json({ success: true, data: parsed.map((p) => p.text).slice(0, 24) });
}

// ─── POST /invoices ───────────────────────────────────────────────────────────
export async function createInvoice(req, res) {
  const {
    property_name, tenant_name, property_id, tenant_id,
    category, bill_date, bill_amount, billing_month,
    credit_terms_days, due_date, status,
    amount_collected, outstanding_balance,
    overdue_by_days, aging_bucket,
  } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO invoices
       (property_name, tenant_name, property_id, tenant_id,
        category, bill_date, bill_amount, billing_month,
        credit_terms_days, due_date, status,
        amount_collected, outstanding_balance,
        overdue_by_days, aging_bucket)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      property_name, tenant_name, property_id ?? null, tenant_id ?? null,
      category, bill_date, bill_amount, billing_month,
      credit_terms_days, due_date ?? null, status,
      amount_collected, outstanding_balance,
      overdue_by_days, aging_bucket,
    ]
  );

  await logAudit(req.user, 'CREATE', 'INVOICE', rows[0].id, { property_id, tenant_id, bill_amount, billing_month });

  res.status(201).json({ success: true, data: rows[0] });
}

// ─── PUT /invoices/:id ────────────────────────────────────────────────────────
export async function updateInvoice(req, res) {
  const fields = { ...req.body };
  const { id } = req.params;

  try {
    const prev = await pool.query(`SELECT amount_collected FROM invoices WHERE id=$1`, [id]);
    if (prev.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found' });

    if (fields.bill_amount !== undefined) {
      const collected = parseFloat(prev.rows[0].amount_collected) || 0;
      const newBill = parseFloat(fields.bill_amount) || 0;
      fields.outstanding_balance = newBill - collected;

      if (fields.outstanding_balance <= 0) {
        fields.status = 'Paid';
        fields.outstanding_balance = 0;
      } else if (collected > 0) {
        fields.status = 'Partial';
      } else {
        fields.status = 'Pending';
      }
    }

    const keys = Object.keys(fields);
    if (!keys.length)
      return res.status(400).json({ success: false, message: 'Nothing to update' });

    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = [...Object.values(fields), id];

    const { rows } = await pool.query(
      `UPDATE invoices SET ${setClauses}
       WHERE id = $${values.length} RETURNING *`,
      values
    );

    await logAudit(req.user, 'UPDATE', 'INVOICE', id, fields);

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// ─── POST /invoices/generate ──────────────────────────────────────────────────
function validateNotFutureMonth(billingMonth, billDate) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [mStr, yStr] = billingMonth.split('-');
  const mIndex = months.indexOf(mStr);
  const year = parseInt(yStr);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (year > currentYear || (year === currentYear && mIndex > currentMonth)) {
    return 'Cannot generate invoices for future billing months';
  }

  const bDate = new Date(billDate);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (bDate > todayEnd) {
    return 'Bill Date cannot be in the future';
  }

  if (bDate.getFullYear() !== year || bDate.getMonth() !== mIndex) {
    return 'Bill Date must fall within the exact same month as the Billing Month';
  }

  return null;
}

function calculateEscalatedRent(billingMonthStr, escalationDueDate, oldRent, newRent) {
  if (!escalationDueDate) return oldRent;
  const parts = billingMonthStr.split('-');
  let bYear, bMonth;
  if (parts[0].length === 4) {
    // YYYY-MM
    bYear = parseInt(parts[0]);
    bMonth = parseInt(parts[1]) - 1;
  } else {
    // MMM-YYYY
    const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    bMonth = ms.indexOf(parts[0]);
    bYear = parseInt(parts[1]);
  }

  const d = new Date(escalationDueDate);
  const dYear = d.getFullYear();
  const dMonth = d.getMonth();

  if (bYear < dYear || (bYear === dYear && bMonth < dMonth)) {
    return oldRent; // Strictly before escalation month
  }

  if (bYear > dYear || (bYear === dYear && bMonth > dMonth)) {
    return newRent; // Strictly after escalation month
  }

  // Exact same month - calculate pro-rata
  const escalationDay = d.getDate();
  const daysInMonth = new Date(bYear, bMonth + 1, 0).getDate();

  if (isNaN(escalationDay) || isNaN(daysInMonth)) {
    return oldRent; // Fallback if dates are invalid
  }

  const oldRentDays = escalationDay - 1;
  const newRentDays = daysInMonth - oldRentDays;

  const proRataRent = ((oldRent * oldRentDays) / daysInMonth) + ((newRent * newRentDays) / daysInMonth);
  const result = Math.round(proRataRent * 100) / 100;
  return isNaN(result) ? oldRent : result;
}


export async function generateInvoices(req, res) {
  const { tenant_id, billing_month, bill_date, categories } = req.body;
  // categories: [{ category, amount }]

  if (!tenant_id || !billing_month || !categories?.length)
    return res.status(400).json({
      success: false,
      message: 'tenant_id, billing_month and categories are required',
    });

  const tenantRes = await pool.query(
    `SELECT t.*, p.name AS property_name
     FROM tenants t
     LEFT JOIN properties p ON p.id = t.property_id
     WHERE t.id = $1`,
    [tenant_id]
  );
  if (!tenantRes.rows.length)
    return res.status(404).json({ success: false, message: 'Tenant not found' });

  const tenant = tenantRes.rows[0];
  const billDate = bill_date || new Date().toISOString().split('T')[0];

  const validationError = validateNotFutureMonth(billing_month, billDate);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const created = [];
  let skippedCount = 0;
  for (const cat of categories) {
    // Check if invoice already exists for this tenant, month, and category
    const existing = await pool.query(
      `SELECT id FROM invoices WHERE tenant_id = $1 AND billing_month = $2 AND category = $3`,
      [tenant.id, billing_month, cat.category]
    );

    if (existing.rows.length > 0) {
      skippedCount++;
      continue;
    }

    const catName = String(cat.category || 'Rent').toLowerCase();
    const creditDays = (catName.includes('power') || catName.includes('water')) ? 7 : 31;
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + creditDays);

    const dueDateStr = dueDate.toISOString().split('T')[0];

    let daysOverdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueTime = new Date(dueDateStr);
    dueTime.setHours(0, 0, 0, 0);

    const diffTime = today - dueTime;
    if (diffTime > 0) {
      daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    let agingBucket = 'Current';
    if (daysOverdue > 90) agingBucket = '90+ Days';
    else if (daysOverdue > 60) agingBucket = '61-90 Days';
    else if (daysOverdue > 30) agingBucket = '31-60 Days';
    else if (daysOverdue > 0) agingBucket = '1-30 Days';

    let finalAmount = parseFloat(cat.amount) || 0;

    const finalAmtSafe = isNaN(finalAmount) ? 0 : finalAmount;

    const { rows } = await pool.query(
      `INSERT INTO invoices
         (property_name, tenant_name, property_id, tenant_id,
          category, bill_date, bill_amount, billing_month,
          credit_terms_days, due_date, status,
          amount_collected, outstanding_balance,
          overdue_by_days, aging_bucket)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending',0,$7,$11,$12)
       RETURNING *`,
      [
        tenant.property_name,
        tenant.name,
        tenant.property_id,
        tenant.id,
        cat.category,
        billDate,
        finalAmtSafe,
        billing_month,
        creditDays,
        dueDateStr,
        daysOverdue,
        agingBucket,
      ]
    );
    created.push(rows[0]);
    await logAudit(req.user, 'CREATE', 'INVOICE', rows[0].id, { tenant_id, bill_amount: cat.amount, billing_month, generated: true });
  }

  if (created.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invoice already exists for this month.',
    });
  }

  res.status(201).json({
    success: true,
    message: 'Invoice created successfully!',
    data: created,
  });
}

// ─── POST /invoices/bulk-generate ─────────────────────────────────────────────
export async function bulkGenerateInvoices(req, res) {
  const { billing_month, bill_date, category, exclude_tenant_ids = [] } = req.body;

  if (!billing_month || !bill_date || !category)
    return res.status(400).json({
      success: false,
      message: 'billing_month, bill_date, and category are required',
    });

  const validationError = validateNotFutureMonth(billing_month, bill_date);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  // Get all active tenants with their categories
  const tenantRes = await pool.query(`
    SELECT t.*, p.name AS property_name,
      COALESCE(
        (SELECT json_agg(json_build_object('category', tc.category, 'amount', tc.amount))
         FROM tenant_categories tc
         WHERE tc.tenant_id = t.id AND tc.is_active = TRUE),
        '[]'::json
      ) AS categories
    FROM tenants t
    LEFT JOIN properties p ON p.id = t.property_id
    WHERE t.is_active = TRUE
  `);

  if (!tenantRes.rows.length) {
    return res.status(404).json({ success: false, message: 'No active tenants found' });
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const tenant of tenantRes.rows) {
    if (exclude_tenant_ids.includes(tenant.id)) {
      skippedCount++;
      continue;
    }

    // Find if tenant has the requested category
    const catObj = tenant.categories?.find(c => c.category === category);

    let amount = 0;
    if (catObj) {
      amount = parseFloat(catObj.amount) || 0;
    } else if (category === 'Rent & CAM' || category === 'Rent') {
      // Fallback for Rent & CAM if not in categories list explicitly
      amount = (parseFloat(tenant.monthly_rent) || 0) + (parseFloat(tenant.cam_amount) || 0);
    }

    if ((category === 'Rent & CAM' || category === 'Rent') && tenant.escalation_new_rent) {
      amount = calculateEscalatedRent(billing_month, tenant.escalation_due_date, amount, parseFloat(tenant.escalation_new_rent));
    }

    if (isNaN(amount)) amount = 0;

    if (amount <= 0) {
      skippedCount++;
      continue;
    }

    // Check if invoice already exists for this month for this tenant and category
    const existing = await pool.query(
      `SELECT id FROM invoices WHERE tenant_id = $1 AND billing_month = $2 AND category = $3`,
      [tenant.id, billing_month, category]
    );

    if (existing.rows.length > 0) {
      skippedCount++;
      continue;
    }

    const catName = String(category).toLowerCase();
    const creditDays = (catName.includes('power') || catName.includes('water')) ? 7 : 31;
    const dueDate = new Date(bill_date);
    dueDate.setDate(dueDate.getDate() + creditDays);

    const dueDateStr = dueDate.toISOString().split('T')[0];

    let daysOverdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueTime = new Date(dueDateStr);
    dueTime.setHours(0, 0, 0, 0);

    const diffTime = today - dueTime;
    if (diffTime > 0) {
      daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    let agingBucket = 'Current';
    if (daysOverdue > 90) agingBucket = '90+ Days';
    else if (daysOverdue > 60) agingBucket = '61-90 Days';
    else if (daysOverdue > 30) agingBucket = '31-60 Days';
    else if (daysOverdue > 0) agingBucket = '1-30 Days';

    await pool.query(
      `INSERT INTO invoices
         (property_name, tenant_name, property_id, tenant_id,
          category, bill_date, bill_amount, billing_month,
          credit_terms_days, due_date, status,
          amount_collected, outstanding_balance,
          overdue_by_days, aging_bucket)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending',0,$7,$11,$12)`,
      [
        tenant.property_name || '—',
        tenant.name,
        tenant.property_id,
        tenant.id,
        category,
        bill_date,
        amount,
        billing_month,
        creditDays,
        dueDateStr,
        daysOverdue,
        agingBucket,
      ]
    );
    createdCount++;
    await logAudit(req.user, 'CREATE', 'INVOICE', null, { tenant_id: tenant.id, bill_amount: amount, billing_month, generated: true, bulk: true });
  }

  if (createdCount === 0) {
    return res.status(400).json({
      success: false,
      message: 'No new invoices were generated (they already exist or amounts are 0).',
    });
  }

  res.status(201).json({
    success: true,
    message: `Bulk generation completed! Created ${createdCount} invoice(s).`,
    createdCount,
  });
}

// ─── POST /invoices/preview-reminder ──────────────────────────────────────────

export async function previewOverdueReminder(req, res) {
  try {
    const { tenant_id } = req.body;
    if (!tenant_id) {
      return res.status(400).json({ success: false, message: 'tenant_id is required' });
    }

    const { rows } = await pool.query(`
      SELECT 
        i.*, 
        t.email AS tenant_email
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      WHERE (i.status = 'Pending' OR i.status = 'Partial')
        AND i.outstanding_balance > 0
        AND i.tenant_id = $1
    `, [tenant_id]);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'No pending invoices found for this tenant.' });
    }

    let totalOutstanding = 0;
    for (const inv of rows) {
      totalOutstanding += Number(inv.outstanding_balance);
    }

    const tenantName = rows[0].tenant_name;
    const email = rows[0].tenant_email;

    const preview = generateReminderContent(tenantName, rows, totalOutstanding);

    res.json({
      success: true,
      data: {
        to: email,
        subject: preview.subject,
        html: preview.htmlContent
      }
    });
  } catch (error) {
    console.error('Error previewing reminder:', error);
    res.status(500).json({ success: false, message: 'Internal server error while previewing reminder' });
  }
}

// ─── POST /invoices/send-reminders ─────────────────────────────────────────────

export async function sendOverdueReminders(req, res) {
  try {
    const { tenant_id, override_email, override_subject, override_html, bcc } = req.body;
    const params = [];
    let tenantFilter = '';

    if (tenant_id) {
      params.push(tenant_id);
      tenantFilter = 'AND i.tenant_id = $1';

      // If an override email is provided, save it permanently to the tenant!
      if (override_email) {
        await pool.query('UPDATE tenants SET email = $1 WHERE id = $2', [override_email, tenant_id]);
      }
    }

    try {
      await pool.query(`UPDATE invoices SET bill_amount = 0 WHERE bill_amount IS NULL OR bill_amount::text = 'NaN' OR bill_amount::text = 'null'`);
      await pool.query(`UPDATE invoices SET outstanding_balance = 0 WHERE outstanding_balance IS NULL OR outstanding_balance::text = 'NaN' OR outstanding_balance::text = 'null'`);
    } catch (e) {
      console.error('NaN cleanup failed', e);
    }

    // Fetch all pending/partial invoices that are overdue
    const { rows } = await pool.query(`
      SELECT 
        i.*, 
        t.email AS tenant_email
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      WHERE (i.status = 'Pending' OR i.status = 'Partial')
        AND i.outstanding_balance > 0
        ${tenantFilter}
    `, params);

    if (rows.length === 0) {
      return res.json({ success: true, message: 'No pending invoices found for this tenant.' });
    }

    // Group by tenant
    const tenantGroups = {};
    for (const inv of rows) {
      if (!tenantGroups[inv.tenant_id]) {
        tenantGroups[inv.tenant_id] = {
          tenant_name: inv.tenant_name,
          email: override_email || inv.tenant_email,
          invoices: [],
          total_outstanding: 0,
        };
      }
      tenantGroups[inv.tenant_id].invoices.push(inv);
      tenantGroups[inv.tenant_id].total_outstanding += Number(inv.outstanding_balance);
    }

    let sentCount = 0;
    for (const tenantId in tenantGroups) {
      const group = tenantGroups[tenantId];
      const success = await sendReminderEmail(
        group.email,
        group.tenant_name,
        group.invoices,
        group.total_outstanding,
        override_subject,
        override_html,
        bcc
      );
      if (success) {
        sentCount++;
      }
    }

    res.json({
      success: true,
      message: `Sent reminders to ${sentCount} tenant(s) successfully.`,
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ success: false, message: 'Internal server error while sending reminders' });
  }
}

// ─── DELETE /invoices/:id ─────────────────────────────────────────────────────
export async function deleteInvoice(req, res) {
  try {
    const { id } = req.params;

    // Check if invoice exists and get its status
    const existing = await pool.query('SELECT status FROM invoices WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Ensure receipts are deleted/handled? (CASCADE is on receipts)
    const { rows } = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

    if (rows.length > 0) {
      await logAudit(req.user, 'DELETE', 'INVOICE', id, { deleted_invoice: rows[0] });
      return res.json({ success: true, message: 'Invoice deleted successfully' });
    }

    return res.status(400).json({ success: false, message: 'Failed to delete invoice' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}