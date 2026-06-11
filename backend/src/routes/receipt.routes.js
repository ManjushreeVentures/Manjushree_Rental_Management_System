import { Router } from 'express';
import {
  getAllReceipts,
  getReceiptById,
  createReceipt,
  deleteReceipt,
  getReceiptStats,
  uploadReceiptFile,
} from '../controllers/receipt.controller.js';
import { validate }       from '../middleware/validate.js';
import { receiptSchema }  from '../models/receipt.model.js';
import { receiptUploadMiddleware } from '../middleware/receiptUpload.middleware.js';

const router = Router();

router.get('/stats', getReceiptStats);
router.get('/',      getAllReceipts);
router.get('/:id',   getReceiptById);
router.post('/',     validate(receiptSchema), createReceipt);
router.post('/upload', receiptUploadMiddleware, uploadReceiptFile);
router.delete('/:id', deleteReceipt);

export default router;