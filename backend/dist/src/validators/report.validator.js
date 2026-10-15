import { z } from 'zod';
import { LoadStatus } from '../types';
const LOAD_STATUSES = Object.values(LoadStatus);
export const reportQuerySchema = z.object({
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    format: z.enum(['json', 'csv']).default('json'),
    group_by: z.enum(['day', 'week', 'month']).optional(),
    status: z.enum(LOAD_STATUSES).optional(),
    driver_id: z.string().uuid().optional(),
    broker_id: z.string().uuid().optional()
});
