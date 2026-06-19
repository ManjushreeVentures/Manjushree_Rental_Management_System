import { Router } from 'express';
import {
  getAllTenants, getTenantById,
  createTenant, updateTenant, deleteTenant,
  getTenantCategories, upsertTenantCategories,
  getEscalationTracker, applyEscalation,
  uploadTenantFile,
} from '../controllers/tenant.controller.js';
import { validate } from '../middleware/validate.js';
import { tenantSchema } from '../models/tenant.model.js';
import { receiptUploadMiddleware } from '../middleware/receiptUpload.middleware.js';

const router = Router();

router.get('/escalation', getEscalationTracker);
router.get('/', getAllTenants);
router.get('/:id', getTenantById);
router.post('/', validate(tenantSchema), createTenant);
router.post('/upload', receiptUploadMiddleware, uploadTenantFile);
router.put('/:id', validate(tenantSchema.partial()), updateTenant);
router.delete('/:id', deleteTenant);
router.get('/:id/categories', getTenantCategories);
router.post('/:id/categories', upsertTenantCategories);
router.post('/:id/apply-escalation', applyEscalation);

import pool from '../config/db.js';
router.get('/test/db', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT t.name as tenant_name, tc.category, tc.amount, tc.is_active 
    FROM tenants t 
    LEFT JOIN tenant_categories tc ON tc.tenant_id = t.id 
    WHERE tc.is_active = true
    ORDER BY t.name
  `);
  res.json(rows);
});

export default router;