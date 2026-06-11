import { z } from 'zod';

export const propertySchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  address:     z.string().optional(),
  city:        z.string().optional(),
  total_units: z.coerce.number().int().min(0).default(0),
  owner_name:  z.string().optional(),
  owner_email: z.string().email().optional().or(z.literal('')),
  owner_phone: z.string().optional(),
  gstin:       z.string().optional(),
  total_area:  z.coerce.number().min(0).optional(),
  leased_area: z.coerce.number().min(0).optional(),
  vacant_area: z.coerce.number().min(0).optional(),
  total_amount: z.coerce.number().min(0).optional(),
  is_active:   z.boolean().default(true),
  attachment_url: z.string().optional().nullable(),
});