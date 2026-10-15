import { z } from 'zod';

export const createTruckSchema = z.object({
  body: z.object({
    unit_number: z.string().min(1).max(50),
    vin: z.string().max(17).optional().nullable(),
    make: z.string().min(1).max(50),
    model: z.string().min(1).max(50),
    year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
    type: z.enum(['DRY_VAN', 'FLATBED', 'REEFER', 'STEP_DECK', 'OTHER']),
    license_plate: z.string().max(20).optional().nullable(),
    license_state: z.string().length(2).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).default('ACTIVE'),
    notes: z.string().max(1000).optional().nullable(),
  }),
});

export const updateTruckSchema = z.object({
  body: createTruckSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});
