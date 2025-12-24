import { defineConfig } from '@adonisjs/core/app';

export default defineConfig({
  typescript: true,
  experimental: {
    mergeMultipartFieldsAndFiles: true,
    shutdownInReverseOrder: true,
  },
  directories: {
    config: './config',
    public: './public',
    resources: './resources',
    start: './start',
    tmp: './tmp',
    views: './resources/views',
  },
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('./app/providers/app_provider.js'),
    () => import('./app/providers/services_provider.js'),
  ],
  preloads: [() => import('#start/routes'), () => import('#start/kernel')],
  commands: [() => import('@adonisjs/core/commands'), () => import('@adonisjs/lucid/commands')],
  metaFiles: [
    {
      pattern: 'public/**/*',
      reloadServer: false,
    },
  ],
  tests: {
    suites: [
      {
        files: ['tests/unit/**/*.spec(.ts|.js)'],
        name: 'unit',
        timeout: 2_000,
      },
      {
        files: ['tests/functional/**/*.spec(.ts|.js)'],
        name: 'functional',
        timeout: 30_000,
      },
    ],
    forceExit: false,
  },
});
