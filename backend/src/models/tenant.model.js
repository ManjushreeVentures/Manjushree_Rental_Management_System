import { z } from 'zod';

export const tenantSchema = z.object({
  property_id: z.string().uuid('Invalid property'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  unit_no: z.string().optional(),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  monthly_rent: z.coerce.number().min(0).optional(),
  security_deposit: z.coerce.number().min(0).optional(),
  tenant_area: z.coerce.number().min(0).optional(),
  rate_per_sft: z.coerce.number().min(0).optional(),
  cam_amount: z.coerce.number().min(0).optional(),
  escalation_pct: z.coerce.number().min(0).max(100).optional(),
  escalation_due_date: z.string().optional(),
  escalation_new_rent: z.coerce.number().min(0).optional(),
  escalation_applied: z.boolean().default(false),
  is_active: z.boolean().default(true),
  unit_ids: z.array(z.string().uuid()).optional(),
  attachment_url: z.string().optional().nullable(),
});