import { z } from 'zod';

export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const createLoadSchema = z.object({
  loadNumber: z.string().min(1, 'Load number is required'),
  brokerId: z.string().min(1, 'Broker is required'),
  rate: z.coerce.number().positive('Rate must be greater than 0'),
  // Add other required fields depending on the backend model
});
