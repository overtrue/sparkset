import { Secret } from '@adonisjs/core/helpers';
import { defineConfig } from '@adonisjs/core/http';
import env from '#start/env';

export const appKey = new Secret(env.get('APP_KEY'));

export const http = defineConfig({
  allowMethodSpoofing: false,
  trustProxy: false,
});
