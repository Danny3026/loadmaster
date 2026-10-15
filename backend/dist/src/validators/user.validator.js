import { z } from 'zod';
export const createUserSchema = z.object({
    body: z.object({
        email: z.string().email(),
        password: z.string().min(6),
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        phone: z.string().optional().nullable(),
        pay_percentage: z.number().optional().nullable(),
        role_id: z.string().uuid().optional(),
        role: z.enum(['ADMIN', 'DISPATCHER', 'DRIVER']).optional(),
    }).refine((data) => data.role_id || data.role, { message: 'Either role_id or role must be provided' }),
});
export const updateUserSchema = z.object({
    body: z.object({
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        first_name: z.string().min(1).optional(),
        last_name: z.string().min(1).optional(),
        phone: z.string().optional(),
        pay_percentage: z.number().optional().nullable(),
        role_id: z.string().uuid().optional(),
        status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    }),
});
