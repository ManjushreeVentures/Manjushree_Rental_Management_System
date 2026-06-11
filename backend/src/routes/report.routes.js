import { Router } from 'express';
import {
  outstandingReport,
  collectionSummary,
  agingDetail,
  tenantLedger,
  rentRoll,
} from '../controllers/report.controller.js';

const router = Router();

router.get('/outstanding',         outstandingReport);
router.get('/collection-summary',  collectionSummary);
router.get('/aging-detail',        agingDetail);
router.get('/tenant-ledger',       tenantLedger);
router.get('/rent-roll',           rentRoll);

export default router;