import dotenv from 'dotenv';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3333'),
  HOST: z.string().default('0.0.0.0'),
  SPARKLINE_ENV: z.enum(['dev', 'test', 'prod']).default('dev'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (): Env => {
  dotenv.config();
  return envSchema.parse(process.env);
};
