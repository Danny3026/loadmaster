import { z } from 'zod';
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
    }),
});
export const registerSchema = z.object({
    body: z.object({
        companyName: z.string().trim().min(1).max(150),
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(128),
        phone: z.string().trim().max(32).optional().nullable(),
    }),
});
export const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string().min(6).optional(),
        newPassword: z.string().min(8),
        confirmPassword: z.string().min(8),
    }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    }),
});
export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z.string().email('Invalid email address'),
    }),
});
export const resetPasswordSchema = z.object({
    body: z.object({
        token: z.string().min(1, 'Token is required'),
        newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    }),
});
