import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { errorHandler } from './middleware/errorHandler.js';
import { authenticateJWT } from './middleware/authJwt.js';

import authRoutes          from './routes/auth.routes.js';
import propertyRoutes    from './routes/property.routes.js';
import tenantRoutes      from './routes/tenant.routes.js';
import invoiceRoutes     from './routes/invoice.routes.js';
import receiptRoutes     from './routes/receipt.routes.js';
import uploadRoutes      from './routes/upload.routes.js';
import dashboardRoutes   from './routes/dashboard.routes.js';
import receivableRoutes  from './routes/receivable.routes.js';
import reportRoutes      from './routes/report.routes.js';
import unitRoutes        from './routes/unit.routes.js';
import auditRoutes       from './routes/audit.routes.js';

import fs from 'fs';
import path from 'path';

const app  = express();
const PORT = process.env.PORT ?? 5000;


app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

import pool from './config/db.js';
app.get('/api/debug-db', async (req, res) => {
  try {
    const inv = await pool.query(`SELECT id, tenant_name, bill_amount, outstanding_balance FROM invoices ORDER BY created_at DESC LIMIT 10`);
    const rec = await pool.query(`SELECT id, amount, payment_mode FROM receipts ORDER BY created_at DESC LIMIT 10`);
    const count = await pool.query(`SELECT COUNT(*) FROM invoices`);
    res.json({
      total_invoices_in_db: count.rows[0].count,
      latest_invoices: inv.rows,
      latest_receipts: rec.rows
    });
  } catch(e) {
    res.json({ error: e.message });
  }
});

// ─── AUTH ROUTES (no JWT required) ────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── APPLY JWT MIDDLEWARE to all other routes ──────────────────────────────────
app.use(authenticateJWT);

// ─── PROTECTED ROUTES ─────────────────────────────────────────────────────────
app.use('/api/properties',   propertyRoutes);
app.use('/api/units',        unitRoutes);
app.use('/api/tenants',      tenantRoutes);
app.use('/api/invoices',     invoiceRoutes);
app.use('/api/receipts',     receiptRoutes);
app.use('/api/upload',       uploadRoutes);
app.use('/api/dashboard',    dashboardRoutes);
app.use('/api/receivables',  receivableRoutes);
app.use('/api/reports',      reportRoutes);
app.use('/api/audit-logs',   auditRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));