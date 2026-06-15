import pool from '../config/db.js';
import { logAudit } from '../services/audit.service.js';

// ─── GET /receipts ────────────────────────────────────────────────────────────
export async function getAllReceipts(req, res) {
  const {
    search, payment_mode, billing_month,
    property_name, tenant_name, category,
    date_from, date_to,
    page = 1, limit = 50,
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let where    = 'WHERE 1=1';

  const add = (clause, value) => {
    params.push(value);
    where += ` AND ${clause.replace('?', `$${params.length}`)}`;
  };

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (
      i.tenant_name    ILIKE $${params.length} OR
      i.property_name  ILIKE $${params.length} OR
      r.reference_no   ILIKE $${params.length}
    )`;
  }
  if (payment_mode)  add('r.payment_mode = ?',       payment_mode);
  if (billing_month) add('i.billing_month = ?',       billing_month);
  if (property_name) add('i.property_name = ?',       property_name);
  if (tenant_name)   add('i.tenant_name = ?',         tenant_name);
  if (category)      add('i.category = ?',            category);
  if (date_from)     add('r.payment_date >= ?::date', date_from);
  if (date_to)       add('r.payment_date <= ?::date', date_to);

  const dataQuery = `
    SELECT
      r.*,
      i.tenant_name,
      i.property_name,
      i.category,
      i.billing_month,
      i.bill_amount,
      i.outstanding_balance  AS invoice_outstanding,
      i.status               AS invoice_status
    FROM receipts r
    JOIN invoices i ON i.id = r.invoice_id
    ${where}
    ORDER BY r.payment_date DESC, r.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(*)
    FROM receipts r
    JOIN invoices i ON i.id = r.invoice_id
    ${where}
  `;

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

// ─── GET /receipts/:id ────────────────────────────────────────────────────────
export async function getReceiptById(req, res) {
  const { rows } = await pool.query(
    `SELECT
       r.*,
       i.tenant_name,   i.property_name,
       i.category,      i.billing_month,
       i.bill_amount,   i.outstanding_balance,
       i.status         AS invoice_status,
       i.due_date,      i.bill_date
     FROM receipts r
     JOIN invoices i ON i.id = r.invoice_id
     WHERE r.id = $1`,
    [req.params.id]
  );
  if (!rows.length)
    return res.status(404).json({ success: false, message: 'Receipt not found' });
  res.json({ success: true, data: rows[0] });
}

// ─── POST /receipts ───────────────────────────────────────────────────────────
export async function createReceipt(req, res) {
  const { invoice_id, amount, payment_date, payment_mode, reference_no, remarks, attachment_url } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // lock invoice row for update
    const invRes = await client.query(
      `SELECT id, bill_amount, amount_collected, outstanding_balance, status
       FROM invoices WHERE id = $1 FOR UPDATE`,
      [invoice_id]
    );
    if (!invRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const inv = invRes.rows[0];

    // guard: can't over-collect
    if (parseFloat(amount) > parseFloat(inv.outstanding_balance)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Amount (${amount}) exceeds outstanding balance (${inv.outstanding_balance})`,
      });
    }

    // insert receipt
    const recRes = await client.query(
      `INSERT INTO receipts
         (invoice_id, tenant_id, property_id, amount, payment_date,
          payment_mode, reference_no, remarks, attachment_url)
       SELECT $1, tenant_id, property_id, $2, $3, $4, $5, $6, $7
       FROM invoices WHERE id = $1
       RETURNING *`,
      [invoice_id, amount, payment_date, payment_mode, reference_no ?? null, remarks ?? null, attachment_url ?? null]
    );

    // recalculate invoice
    const newCollected    = parseFloat(inv.amount_collected)    + parseFloat(amount);
    const newOutstanding  = parseFloat(inv.bill_amount)         - newCollected;
    const newStatus       = newOutstanding <= 0 ? 'Paid'
                          : newCollected   >  0 ? 'Partial'
                          :                       'Pending';

    // recalculate aging bucket based on new outstanding and overdue days
    const updInv = await client.query(
      `UPDATE invoices
       SET
         amount_collected    = $1,
         outstanding_balance = $2,
         status              = $3
       WHERE id = $4
       RETURNING *`,
      [newCollected, Math.max(0, newOutstanding), newStatus, invoice_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        receipt:        recRes.rows[0],
        updatedInvoice: updInv.rows[0],
      },
    });

    await logAudit(req.user, 'CREATE', 'RECEIPT', recRes.rows[0].id, { invoice_id, amount, payment_date });

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── DELETE /receipts/:id ─────────────────────────────────────────────────────
// reverses the payment and restores invoice balance
export async function deleteReceipt(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const recRes = await client.query(
      `SELECT * FROM receipts WHERE id = $1`, [req.params.id]
    );
    if (!recRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const receipt = recRes.rows[0];

    // reverse on invoice
    const invRes = await client.query(
      `SELECT bill_amount, amount_collected FROM invoices WHERE id = $1 FOR UPDATE`,
      [receipt.invoice_id]
    );
    const inv            = invRes.rows[0];
    const newCollected   = Math.max(0, parseFloat(inv.amount_collected) - parseFloat(receipt.amount));
    const newOutstanding = parseFloat(inv.bill_amount) - newCollected;
    const newStatus      = newOutstanding >= parseFloat(inv.bill_amount) ? 'Pending'
                         : newCollected   > 0                            ? 'Partial'
                         :                                                 'Paid';

    await client.query(
      `UPDATE invoices
       SET amount_collected = $1, outstanding_balance = $2, status = $3
       WHERE id = $4`,
      [newCollected, newOutstanding, newStatus, receipt.invoice_id]
    );

    await client.query(`DELETE FROM receipts WHERE id = $1`, [req.params.id]);
    await client.query('COMMIT');

    await logAudit(req.user, 'DELETE', 'RECEIPT', req.params.id, { invoice_id: receipt.invoice_id, amount: receipt.amount });

    res.json({ success: true, message: 'Receipt deleted and invoice balance restored' });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── GET /receipts/stats ──────────────────────────────────────────────────────
export async function getReceiptStats(req, res) {
  const { date_from, date_to, billing_month } = req.query;
  const params = [];
  let where    = 'WHERE 1=1';
  let join     = '';

  if (billing_month) {
    join = 'JOIN invoices i ON i.id = r.invoice_id';
    params.push(billing_month);
    where += ` AND i.billing_month = $${params.length}`;
  }

  if (date_from) { params.push(date_from); where += ` AND r.payment_date >= $${params.length}::date`; }
  if (date_to)   { params.push(date_to);   where += ` AND r.payment_date <= $${params.length}::date`; }

  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                           AS total_receipts,
       COALESCE(SUM(r.amount), 0)                        AS total_collected,
       COALESCE(SUM(r.amount) FILTER
         (WHERE r.payment_mode = 'NEFT'),  0)            AS neft,
       COALESCE(SUM(r.amount) FILTER
         (WHERE r.payment_mode = 'RTGS'),  0)            AS rtgs,
       COALESCE(SUM(r.amount) FILTER
         (WHERE r.payment_mode = 'Cheque'),0)            AS cheque,
       COALESCE(SUM(r.amount) FILTER
         (WHERE r.payment_mode = 'UPI'),   0)            AS upi,
       COALESCE(SUM(r.amount) FILTER
         (WHERE r.payment_mode = 'Cash'),  0)            AS cash
     FROM receipts r ${join} ${where}`,
    params
  );
  res.json({ success: true, data: rows[0] });
}

import { uploadToSupabase } from '../services/supabaseUpload.service.js';

export async function uploadReceiptFile(req, res) {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded' });

  try {
    const filename = await uploadToSupabase(req.file, 'receipt');
    res.json({ success: true, url: filename });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}