import { defineConfig } from '@adonisjs/cors';
import { allowTrustedCorsOrigin } from '../app/security/browser_origins.js';

const corsConfig = defineConfig({
  enabled: true,
  origin: (origin) => allowTrustedCorsOrigin(origin),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
});

export default corsConfig;
