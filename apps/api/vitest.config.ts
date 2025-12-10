import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@sparkline/core': path.resolve(__dirname, '../../packages/core/src'),
      '@sparkline/models': path.resolve(__dirname, '../../packages/models/src'),
      '@sparkline/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
});
