import { z } from 'zod';

export const receiptSchema = z.object({
  invoice_id:     z.string().uuid('Invalid invoice ID'),
  amount:         z.coerce.number().min(1, 'Amount must be greater than 0'),
  payment_date:   z.string().min(1, 'Payment date is required'),
  payment_mode:   z.enum(['NEFT', 'RTGS', 'Cheque', 'UPI', 'Cash', 'Other']),
  reference_no:   z.string().optional(),
  remarks:        z.string().optional(),
  attachment_url: z.string().optional().nullable(),
});