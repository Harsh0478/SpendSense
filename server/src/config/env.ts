import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
