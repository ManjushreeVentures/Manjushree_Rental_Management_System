import { Router } from 'express';
import {
  getAgingSummary,
  getOutstandingRegister,
  getTenantOutstanding,
  getOverdueAlerts,
  getCollectionTrend,
} from '../controllers/receivable.controller.js';

const router = Router();

router.get('/aging',               getAgingSummary);
router.get('/register',            getOutstandingRegister);
router.get('/tenant/:tenantName',  getTenantOutstanding);
router.get('/alerts',              getOverdueAlerts);
router.get('/trend',               getCollectionTrend);

export default router;