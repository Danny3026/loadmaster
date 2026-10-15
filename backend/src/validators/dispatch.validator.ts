import { z } from 'zod';

export const assignSchema = z.object({
  body: z.object({
    driver_id: z.string().uuid(),
    truck_id: z.string().uuid().optional(),
    dispatch: z.boolean().optional(),
    override_availability_conflict: z.boolean().optional(),
  }),
});

export const statusUpdateSchema = z.object({
  body: z.object({
    status: z.enum([
      'pending', 'dispatched', 'in_transit', 'delivered'
    ]),
    notes: z.string().optional(),
  }),
});
