import { z } from 'zod';

export const createBrokerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    mc_number: z.string().max(20).optional().nullable(),
    contact_name: z.string().max(100).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(20).optional().nullable(),
    address_line1: z.string().max(100).optional().nullable(),
    address_line2: z.string().max(100).optional().nullable(),
    city: z.string().max(50).optional().nullable(),
    state: z.string().length(2).optional().nullable(),
    zip_code: z.string().max(20).optional().nullable(),
    payment_terms: z.string().max(50).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  }),
});

export const updateBrokerSchema = z.object({
  body: createBrokerSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});
