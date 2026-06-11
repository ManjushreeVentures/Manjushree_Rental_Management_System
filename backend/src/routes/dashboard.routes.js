import { Router } from 'express';
import {
  getDashboardFull,
  getKPIs,
  getAgingSnapshot,
  getTenantSummary,
  getDashboardAlerts,
  getRecentActivity,
} from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/',           getDashboardFull);
router.get('/kpis',       getKPIs);
router.get('/aging',      getAgingSnapshot);
router.get('/tenants',    getTenantSummary);
router.get('/alerts',     getDashboardAlerts);
router.get('/activity',   getRecentActivity);

export default router;