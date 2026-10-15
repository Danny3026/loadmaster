import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const envSchema = z.object({
    PORT: z.string().transform(Number).default('3000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    ENABLE_1099_TEST_FIXTURE: z.enum(['true', 'false']).transform((value) => value === 'true').default('false'),
    DATABASE_URL: z.string(),
    JWT_SECRET: z.string(),
    PAYER_TAX_ENCRYPTION_KEY: z.string().min(32).optional(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    JWT_REFRESH_SECRET: z.string(),
    JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
    STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_PATH: z.string().default('./storage'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('LoadMaster Dispatch <noreply@loadmaster.com>'),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL_PRIMARY: z.string().default('gemini-3.6-flash'),
    GEMINI_MODEL_FALLBACK_1: z.string().default('gemini-2.5-flash'),
    GEMINI_MODEL_FALLBACK_2: z.string().default('gemini-3.1-flash-lite'),
    MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
    ALLOWED_FILE_TYPES: z.string().default('application/pdf,image/jpeg,image/png,image/webp'),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    process.exit(1);
}
export const env = parsed.data;
