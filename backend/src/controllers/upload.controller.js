// import pool from '../config/db.js';
// import { parseExcelBuffer } from '../services/excelParser.services.js';

// export async function uploadExcel(req, res) {
//   if (!req.file)
//     return res.status(400).json({ success: false, message: 'No file uploaded' });

//   const auditRes = await pool.query(
//     `INSERT INTO excel_uploads (filename, status) VALUES ($1, 'processing') RETURNING id`,
//     [req.file.originalname]
//   );
//   const batchId = auditRes.rows[0].id;

//   try {
//     const { rows, skipped } = parseExcelBuffer(req.file.buffer);

//     if (!rows.length) {
//       await pool.query(
//         `UPDATE excel_uploads SET status='failed', rows_skipped=$1,
//           error_log=$2, uploaded_at=NOW() WHERE id=$3`,
//         [skipped.length, JSON.stringify(skipped), batchId]
//       );
//       return res.status(422).json({
//         success: false,
//         message: 'No valid rows found in file',
//         skipped,
//       });
//     }

//     const propNames   = [...new Set(rows.map((r) => r.property_name))];
//     const tenantNames = [...new Set(rows.map((r) => r.tenant_name))];

//     const propRows = await pool.query(
//       `SELECT id, name FROM properties WHERE name = ANY($1)`, [propNames]
//     );
//     const tenantRows = await pool.query(
//       `SELECT id, name FROM tenants WHERE name = ANY($1)`, [tenantNames]
//     );

//     const propMap   = Object.fromEntries(propRows.rows.map((r)   => [r.name, r.id]));
//     const tenantMap = Object.fromEntries(tenantRows.rows.map((r) => [r.name, r.id]));

//     const client = await pool.connect();
//     try {
//       await client.query('BEGIN');

//       let imported = 0;
//       for (const row of rows) {
//         await client.query(
//           `INSERT INTO invoices
//             (property_name, tenant_name, property_id, tenant_id,
//              category, bill_date, bill_amount, billing_month,
//              credit_terms_days, due_date, status,
//              amount_collected, outstanding_balance,
//              overdue_by_days, aging_bucket, upload_batch_id)
//            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
//           [
//             row.property_name,
//             row.tenant_name,
//             propMap[row.property_name]   ?? null,
//             tenantMap[row.tenant_name]   ?? null,
//             row.category,
//             row.bill_date,
//             row.bill_amount,
//             row.billing_month,
//             row.credit_terms_days,
//             row.due_date,
//             row.status,
//             row.amount_collected,
//             row.outstanding_balance,
//             row.overdue_by_days,
//             row.aging_bucket,
//             batchId,
//           ]
//         );
//         imported++;
//       }

//       await client.query('COMMIT');

//       await pool.query(
//         `UPDATE excel_uploads
//          SET status='done', rows_imported=$1, rows_skipped=$2,
//              error_log=$3, uploaded_at=NOW()
//          WHERE id=$4`,
//         [imported, skipped.length, JSON.stringify(skipped), batchId]
//       );

//       res.json({
//         success: true,
//         message: `${imported} rows imported successfully`,
//         data: {
//           batchId,
//           imported,
//           skipped:        skipped.length,
//           skippedDetails: skipped,
//         },
//       });
//     } catch (err) {
//       await client.query('ROLLBACK');
//       throw err;
//     } finally {
//       client.release();
//     }
//   } catch (err) {
//      console.error("❌ UPLOAD ERROR:", err); 
//     await pool.query(
//       `UPDATE excel_uploads SET status='failed', error_log=$1 WHERE id=$2`,
//       [JSON.stringify([{ error: err.message }]), batchId]
//     );

//     const isValidationError = String(err.message).startsWith('Missing required Excel headers');
//     if (isValidationError) {
//       return res.status(422).json({ success: false, message: err.message });
//     }

//     return res.status(500).json({ success: false, message: err.message || 'Upload failed' });
//   }
// }

// export async function getUploadHistory(req, res) {
//   const { rows } = await pool.query(
//     `SELECT * FROM excel_uploads ORDER BY uploaded_at DESC LIMIT 50`
//   );
//   res.json({ success: true, data: rows });
// }


import pool from '../config/db.js';
import { parseExcelBuffer } from '../services/excelParser.services.js';

export async function uploadExcel(req, res) {
  if (!req.file)
    return res.status(400).json({ success: false, message: 'No file uploaded' });

  const auditRes = await pool.query(
    `INSERT INTO excel_uploads (filename, status) VALUES ($1, 'processing') RETURNING id`,
    [req.file.originalname]
  );
  const batchId = auditRes.rows[0].id;

  try {
    const { rows, skipped } = parseExcelBuffer(req.file.buffer);

    if (!rows.length) {
      await pool.query(
        `UPDATE excel_uploads SET status='failed', rows_skipped=$1,
          error_log=$2, uploaded_at=NOW() WHERE id=$3`,
        [skipped.length, JSON.stringify(skipped), batchId]
      );
      return res.status(422).json({
        success: false,
        message: 'No valid rows found in file',
        skipped,
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ── Step 1: upsert properties from Excel ─────────────────────────────
      const propNames = [...new Set(rows.map((r) => r.property_name))];
      for (const name of propNames) {
        await client.query(
          `INSERT INTO properties (name, is_active)
           VALUES ($1, TRUE)
           ON CONFLICT (name) DO NOTHING`,
          [name]
        );
      }

      // fetch property map
      const propRes = await client.query(
        `SELECT id, name FROM properties WHERE name = ANY($1)`, [propNames]
      );
      const propMap = Object.fromEntries(propRes.rows.map((r) => [r.name, r.id]));

      // ── Step 2: upsert tenants from Excel ─────────────────────────────────
      // group by tenant+property to get one row per tenant
      const tenantMap = {}; // "tenant_name|||property_name" → tenant_id

      const uniqueTenants = [
        ...new Map(
          rows.map((r) => [`${r.tenant_name}|||${r.property_name}`, r])
        ).values(),
      ];

      for (const row of uniqueTenants) {
        const propertyId = propMap[row.property_name] ?? null;

        // check if tenant already exists for this property
        const existing = await client.query(
          `SELECT id FROM tenants
           WHERE name = $1
             AND (property_id = $2 OR property_id IS NULL)
           LIMIT 1`,
          [row.tenant_name, propertyId]
        );

        let tenantId;
        if (existing.rows.length) {
          tenantId = existing.rows[0].id;
          // update property_id if it was null
          await client.query(
            `UPDATE tenants SET property_id = COALESCE(property_id, $1)
             WHERE id = $2`,
            [propertyId, tenantId]
          );
        } else {
          // create new tenant from Excel data
          const inserted = await client.query(
            `INSERT INTO tenants (name, property_id, is_active)
             VALUES ($1, $2, TRUE)
             RETURNING id`,
            [row.tenant_name, propertyId]
          );
          tenantId = inserted.rows[0].id;
        }

        tenantMap[`${row.tenant_name}|||${row.property_name}`] = tenantId;
      }

      // ── Step 3: insert invoices ───────────────────────────────────────────
      let imported      = 0;
      let receiptsCreated = 0;
      let duplicatesSkipped = 0;

      for (const row of rows) {
        const propertyId = propMap[row.property_name]   ?? null;
        const tenantId   = tenantMap[`${row.tenant_name}|||${row.property_name}`] ?? null;

        // Skip if invoice already exists for this tenant, month, category, date, and amount
        if (tenantId && row.billing_month && row.category) {
          const existing = await client.query(
            `SELECT id FROM invoices WHERE tenant_id = $1 AND billing_month = $2 AND category = $3 AND bill_date = $4 AND bill_amount = $5`,
            [tenantId, row.billing_month, row.category, row.bill_date, row.bill_amount]
          );
          if (existing.rows.length > 0) {
            duplicatesSkipped++;
            skipped.push({
              row: `Tenant: ${row.tenant_name}`,
              reason: `Duplicate invoice skipped (${row.category} for ${row.billing_month}, Amount: ${row.bill_amount})`
            });
            continue;
          }
        }

        const invRes = await client.query(
          `INSERT INTO invoices
            (property_name, tenant_name, property_id, tenant_id,
             category, bill_date, bill_amount, billing_month,
             credit_terms_days, due_date, status,
             amount_collected, outstanding_balance,
             overdue_by_days, aging_bucket, upload_batch_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           RETURNING id`,
          [
            row.property_name,
            row.tenant_name,
            propertyId,
            tenantId,
            row.category,
            row.bill_date,
            row.bill_amount,
            row.billing_month,
            row.credit_terms_days,
            row.due_date,
            row.status,
            row.amount_collected,
            row.outstanding_balance,
            row.overdue_by_days,
            row.aging_bucket,
            batchId,
          ]
        );

        const invoiceId = invRes.rows[0].id;
        imported++;

        // ── Step 3.5: sync tenant category ─────────────────────────────────
        if (tenantId && row.category) {
          const catExists = await client.query(
            `SELECT id FROM tenant_categories WHERE tenant_id = $1 AND category = $2`,
            [tenantId, row.category]
          );
          if (catExists.rows.length === 0) {
            await client.query(
              `INSERT INTO tenant_categories (tenant_id, category, amount, is_active)
               VALUES ($1, $2, $3, true)`,
              [tenantId, row.category, parseFloat(row.bill_amount) || 0]
            );
          }
        }

        // ── Step 4: create receipt if amount_collected > 0 ─────────────────
        if (parseFloat(row.amount_collected) > 0) {
          await client.query(
            `INSERT INTO receipts
              (invoice_id, tenant_id, property_id,
               amount, payment_date,
               payment_mode, reference_no, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              invoiceId,
              tenantId,
              propertyId,
              row.amount_collected,
              // use bill_date as payment date since Excel doesn't have payment date
              row.bill_date ?? new Date().toISOString().split('T')[0],
              'Excel Import',           // payment mode
              `Batch: ${batchId}`,      // reference
              'Imported from Excel',    // remarks
            ]
          );
          receiptsCreated++;
        }
      }

      await client.query('COMMIT');

      // update audit log
      await pool.query(
        `UPDATE excel_uploads
         SET status='done', rows_imported=$1, rows_skipped=$2,
             error_log=$3, uploaded_at=NOW()
         WHERE id=$4`,
        [imported, skipped.length, JSON.stringify(skipped), batchId]
      );

      res.json({
        success: true,
        message: `${imported} invoices imported · ${duplicatesSkipped} duplicates skipped · properties & tenants auto-created`,
        data: {
          batchId,
          imported,
          receiptsCreated,
          duplicatesSkipped,
          skipped:        skipped.length,
          skippedDetails: skipped,
        },
      });

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    await pool.query(
      `UPDATE excel_uploads SET status='failed', error_log=$1 WHERE id=$2`,
      [JSON.stringify([{ error: err.message }]), batchId]
    );
    throw err;
  }
}

export async function getUploadHistory(req, res) {
  const { rows } = await pool.query(
    `SELECT * FROM excel_uploads ORDER BY uploaded_at DESC LIMIT 50`
  );
  res.json({ success: true, data: rows });
}

import { supabase } from '../config/supabase.js';

export async function verifyPin(req, res) {
  const { pin, filename } = req.body;
  const masterPin = process.env.ATTACHMENT_PIN || '1234';

  if (!pin || pin !== masterPin) {
    return res.status(401).json({ success: false, message: 'Invalid PIN' });
  }

  const cleanFilename = filename.replace('/uploads/', '').replace(/^\/+/, '');

  try {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(cleanFilename, 5 * 60);

    if (error) throw error;

    res.json({
      success: true,
      url: data.signedUrl
    });
  } catch (err) {
    console.error("Supabase signed URL error:", err);
    res.status(500).json({ success: false, message: 'Failed to generate secure URL' });
  }
}