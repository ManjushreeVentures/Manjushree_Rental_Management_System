import { z } from 'zod';

export const receiptSchema = z.object({
  invoice_id:     z.union([z.string().uuid('Invalid invoice ID'), z.literal('')]).optional().nullable(),
  amount:         z.union([z.coerce.number().min(0.01, 'Amount must be greater than 0'), z.literal(''), z.literal(0)]).optional().nullable(),
  allocations:    z.array(z.object({
    invoice_id: z.string().uuid('Invalid invoice ID'),
    amount:     z.coerce.number().min(0.01, 'Amount must be greater than 0'),
  })).optional(),
  payment_date:   z.string().min(1, 'Payment date is required'),
  payment_mode:   z.enum(['NEFT', 'RTGS', 'Cheque', 'UPI', 'Cash', 'Other']),
  reference_no:   z.string().optional().nullable(),
  remarks:        z.string().optional().nullable(),
  attachment_url: z.string().optional().nullable(),
}).refine(data => {
  const hasSingle = (data.invoice_id && data.invoice_id !== '' && data.amount && data.amount !== '');
  const hasAlloc = (data.allocations && data.allocations.length > 0);
  return hasSingle || hasAlloc;
}, {
  message: "Either provide invoice_id and amount, or an allocations array",
  path: ["allocations"]
});