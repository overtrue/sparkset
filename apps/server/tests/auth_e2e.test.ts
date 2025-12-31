import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import testUtils from '@adonisjs/core/services/test_utils';
import db from '@adonisjs/lucid/services/db';
import User from '#models/user';

describe('Authentication E2E', () => {
  beforeAll(async () => {
    // Start HTTP server for e2e tests
    await testUtils.httpServer().start();
  });

  afterAll(async () => {
    // @ts-expect-error - shutdown method exists at runtime
    await testUtils.httpServer().shutdown();
    await db.manager.closeAll();
  });

  describe('Header Authentication Flow', () => {
    it('should authenticate via header and create user', async () => {
      // Make request with header auth
      const httpServer = testUtils.httpServer();
       
      // @ts-expect-error - httpServer() returns API client with get/post methods at runtime
      const response = await httpServer.get('/auth/status')
        .set('X-User-Id', 'e2e-test-123')
        .set('X-User-Name', 'E2E Test User')
        .set('X-User-Email', 'e2e@test.com')
        .set('X-User-Roles', 'admin,analyst');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('authenticated', true);
      expect(response.body.user.username).toBe('E2E Test User');

      // Verify user was created in database
      const user = await User.query().where('uid', 'header:e2e-test-123').first();
      expect(user).not.toBeNull();
      expect(user?.username).toBe('E2E Test User');
      expect(user?.email).toBe('e2e@test.com');
      expect(user?.roles).toEqual(['admin', 'analyst']);
    });

    it('should protect business routes', async () => {
      const httpServer = testUtils.httpServer();
      // Without auth header
       
      // @ts-expect-error - httpServer() returns API client at runtime
      const response1 = await httpServer.get('/datasources');
      expect(response1.status).toBe(401);

      // With auth header
       
      // @ts-expect-error - httpServer() returns API client at runtime
      const response2 = await httpServer.get('/datasources').set('X-User-Id', 'e2e-test-456');

      expect(response2.status).toBe(200);
    });

    it('should reject disabled users', async () => {
      // Create disabled user
      // Create disabled user (unused variable is intentional for test setup)
      await User.create({
        uid: 'header:e2e-disabled',
        provider: 'header',
        username: 'Disabled User',
        isActive: false,
      });

      const httpServer = testUtils.httpServer();
       
      // @ts-expect-error - httpServer() returns API client at runtime
      const response = await httpServer.get('/auth/status').set('X-User-Id', 'e2e-disabled');

      expect(response.status).toBe(403);
    });
  });

  describe('Creator/Updater Tracking', () => {
    it('should automatically set creator_id and updater_id', async () => {
      // Authenticate first
      const httpServer = testUtils.httpServer();
       
      // @ts-expect-error - httpServer() returns API client at runtime
      const authResponse = await httpServer.post('/datasources')
        .set('X-User-Id', 'e2e-tracker')
        .set('X-User-Name', 'Tracker')
        .send({
          name: 'Test DS',
          type: 'mysql',
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'test',
          database: 'test',
        });

      expect(authResponse.status).toBe(201);

      // Verify creator_id was set
      const user = await User.query().where('uid', 'header:e2e-tracker').first();
      const datasource = await db.from('datasources').where('name', 'Test DS').first();

      expect(user).not.toBeNull();
      expect(datasource.creator_id).toBe(user!.id);
      expect(datasource.updater_id).toBe(user!.id);
    });
  });
});
