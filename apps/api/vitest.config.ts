import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@sparkset/core': path.resolve(__dirname, '../../packages/core/src'),
      '@sparkset/models': path.resolve(__dirname, '../../packages/models/src'),
      '@sparkset/db': path.resolve(__dirname, '../../packages/db/src'),
    },
  },
});
