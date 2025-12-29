/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| Validates and exposes environment variables using AdonisJS Env service.
| Keep this schema in sync with config usage across the server.
|
*/

import { Env } from '@adonisjs/core/env';

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  APP_KEY: Env.schema.string(),
  LOG_LEVEL: Env.schema.enum([
    'fatal',
    'error',
    'warn',
    'info',
    'debug',
    'trace',
    'silent',
  ] as const),
  SPARKSET_ENV: Env.schema.enum.optional(['dev', 'test', 'prod'] as const),
  API_KEY: Env.schema.string.optional(),
  DATABASE_URL: Env.schema.string.optional(),
  DB_HOST: Env.schema.string.optional(),
  DB_PORT: Env.schema.number.optional(),
  DB_USER: Env.schema.string.optional(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_NAME: Env.schema.string.optional(),

  // Authentication
  AUTH_HEADER_ENABLED: Env.schema.boolean.optional(),
  AUTH_HEADER_TRUSTED_PROXIES: Env.schema.string.optional(),
  AUTH_HEADER_PREFIX: Env.schema.string.optional(),
  AUTH_HEADER_REQUIRED: Env.schema.string.optional(),

  // OIDC (optional)
  AUTH_OIDC_ENABLED: Env.schema.boolean.optional(),
  AUTH_OIDC_ISSUER: Env.schema.string.optional(),
  AUTH_OIDC_CLIENT_ID: Env.schema.string.optional(),
  AUTH_OIDC_CLIENT_SECRET: Env.schema.string.optional(),

  // Local (optional, dev only)
  AUTH_LOCAL_ENABLED: Env.schema.boolean.optional(),
});
