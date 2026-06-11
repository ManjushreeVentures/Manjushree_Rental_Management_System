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

export default router;