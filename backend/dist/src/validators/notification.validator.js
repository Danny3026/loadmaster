import { z } from 'zod';
export const notificationQuerySchema = z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    unread_only: z.string().optional() // "true" or "false"
});
