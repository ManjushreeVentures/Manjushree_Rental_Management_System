import { z } from 'zod';

export const invoiceSchema = z.object({
  property_name:       z.string().min(1),
  tenant_name:         z.string().min(1),
  property_id:         z.string().uuid().optional().nullable(),
  tenant_id:           z.string().uuid().optional().nullable(),
  category:            z.string().min(1),
  bill_date:           z.string(),
  bill_amount:         z.coerce.number().min(0),
  billing_month:       z.string().min(1),
  credit_terms_days:   z.coerce.number().int().min(0).default(0),
  due_date:            z.string().optional().nullable(),
  status:              z.enum(['Pending', 'Paid', 'Partial']).default('Pending'),
  amount_collected:    z.coerce.number().min(0).default(0),
  outstanding_balance: z.coerce.number().min(0).default(0),
  overdue_by_days:     z.coerce.number().int().min(0).default(0),
  aging_bucket:        z.enum(['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'])
                         .default('Current'),
});