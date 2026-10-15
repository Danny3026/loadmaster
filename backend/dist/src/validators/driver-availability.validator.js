import { z } from 'zod';
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD dates');
const availabilityBodyFields = {
    status: z.literal('UNAVAILABLE').optional(),
    start_date: dateSchema,
    end_date: dateSchema,
    reason: z.string().max(255).optional().nullable(),
};
const availabilityBody = z.object(availabilityBodyFields).refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
});
export const createDriverAvailabilitySchema = z.object({
    body: availabilityBody,
    params: z.object({ id: z.string().uuid() }),
});
export const updateDriverAvailabilitySchema = z.object({
    body: z.object(availabilityBodyFields).partial().refine((data) => !data.start_date || !data.end_date || data.end_date >= data.start_date, {
        message: 'End date must be on or after start date',
        path: ['end_date'],
    }),
    params: z.object({ id: z.string().uuid(), availabilityId: z.string().uuid() }),
});
export const deleteDriverAvailabilitySchema = z.object({
    params: z.object({ id: z.string().uuid(), availabilityId: z.string().uuid() }),
});
export const availabilityTimelineSchema = z.object({
    query: z.object({
        start_date: dateSchema,
        end_date: dateSchema,
    }).refine((data) => data.end_date >= data.start_date, {
        message: 'End date must be on or after start date',
    }),
});
