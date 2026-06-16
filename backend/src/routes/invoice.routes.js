import { Router } from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  getInvoiceStats,
  getBillingMonths,
  createInvoice,
  updateInvoice,
  generateInvoices,
  bulkGenerateInvoices,
  sendOverdueReminders,
  deleteInvoice
} from '../controllers/invoice.controller.js';
import { validate } from '../middleware/validate.js';
import { invoiceSchema } from '../models/invoice.model.js';

const router = Router();

router.get('/stats', getInvoiceStats);
router.get('/billing-months', getBillingMonths);
router.get('/', getAllInvoices);
router.get('/:id', getInvoiceById);
router.post('/', validate(invoiceSchema), createInvoice);
router.put('/:id', validate(invoiceSchema.partial()), updateInvoice);
router.delete('/:id', deleteInvoice);
router.post('/generate', generateInvoices);
router.post('/bulk-generate', bulkGenerateInvoices);
router.post('/send-reminders', sendOverdueReminders);

export default router;