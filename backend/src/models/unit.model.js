import { z } from 'zod';

export const unitSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
  name:        z.string().min(1, 'Unit name is required'),
  total_area:  z.coerce.number().min(0, 'Total area must be a positive number'),
  tenant_id:   z.string().uuid('Invalid tenant ID').optional().nullable(),
  rent_amount: z.coerce.number().min(0).default(0),
  is_active:   z.boolean().default(true),
});
