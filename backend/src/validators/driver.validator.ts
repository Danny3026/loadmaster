import { z } from 'zod';

const compensationRateSchema = z.object({
  load_type: z.enum(['FLATBED', 'REEFER', 'DRY_VAN', 'POWER_ONLY', 'BOX_TRUCK', 'SPRINTER_VAN', 'HOT_SHOT']),
  pay_type: z.enum(['PER_MILE', 'PERCENT_OF_RATE']),
  rate: z.number().nonnegative().nullable(),
});

const driverBodySchema = z.object({
    first_name: z.string().min(1).max(100),
    last_name: z.string().min(1).max(100),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(7).max(20).optional().nullable(),
    license_number: z.string().min(1).max(50),
    license_state: z.string().min(2).max(10).optional().nullable(),
    // Accept YYYY-MM-DD date strings or full ISO datetime
    license_expiry: z.string().optional().nullable(),
    user_id: z.string().uuid().optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
    truck_id: z.string().uuid().optional().nullable(),
    trailer_number: z.string().max(50).optional().nullable(),
    current_city: z.string().max(100).optional().nullable(),
    current_state: z.string().max(10).optional().nullable(),
    mailing_address: z.string().max(255).optional().nullable(),
    mailing_city: z.string().max(100).optional().nullable(),
    mailing_state: z.string().regex(/^[A-Za-z]{2}$/).optional().nullable(),
    mailing_zip: z.string().regex(/^\d{5}(?:-\d{4})?$/).optional().nullable(),
    tin: z.string().max(32).optional().nullable(),
    cdl_class: z.string().max(32).optional().nullable(),
    cdl_endorsements: z.string().max(255).optional().nullable(),
    cdl_restrictions: z.string().max(255).optional().nullable(),
    cdl_issue_date: z.string().optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    medical_card_expiry: z.string().optional().nullable(),
    clearinghouse_renewal_date: z.string().optional().nullable(),
    default_compensation_type: z.enum(['PER_MILE', 'PERCENT_OF_RATE']).optional(),
    default_compensation_rate: z.number().nonnegative().nullable().optional(),
    compensation_rates: z.array(compensationRateSchema).max(7).optional(),
    // ASSIGNED is set automatically by the dispatch system when a load is assigned
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE']).default('ACTIVE'),
});

export const createDriverSchema = z.object({
  body: driverBodySchema.refine((data) => data.email || data.user_id, {
    message: 'Email is required unless an existing Driver account is linked',
    path: ['email'],
  }),
});

export const updateDriverSchema = z.object({
  body: driverBodySchema.partial(),
  params: z.object({ id: z.string().uuid() }),
});
