import { z } from 'zod';
export const paginationSchema = z.object({
    query: z.object({
        page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
        limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
});
export const loadFilterSchema = paginationSchema.extend({
    query: paginationSchema.shape.query.extend({
        status: z.string().optional(),
        broker_id: z.string().uuid().optional(),
        driver_id: z.string().uuid().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        search: z.string().optional(),
        type: z.string().optional(),
    }),
});
