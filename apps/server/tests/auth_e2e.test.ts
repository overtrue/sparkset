import { describe } from 'vitest';

/**
 * E2E tests for authentication
 *
 * Note: These tests require AdonisJS app to be booted and HTTP server to be running.
 * In Vitest environment, testUtils.httpServer() may not work correctly.
 * These tests are better suited for Japa test runner which properly initializes AdonisJS app.
 *
 * For now, these tests are skipped in Vitest environment.
 * To run E2E tests, use: node bin/test.ts
 */
describe.skip('Authentication E2E', () => {
  // E2E tests require Japa test runner with proper AdonisJS app initialization
  // Skipped in Vitest environment
});
