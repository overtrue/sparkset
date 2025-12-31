import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { testUtils } from '@adonisjs/core/services/test_utils';
import { Database } from '@adonisjs/lucid/database';
import User from '#models/user';

describe('Authentication E2E', () => {
  let db: Database;

  beforeAll(async () => {
    // Start HTTP server for e2e tests
    await testUtils.httpServer().start();
    db = Database.connection();
  });

  afterAll(async () => {
    await testUtils.httpServer().shutdown();
    await db.close();
  });

  describe('Header Authentication Flow', () => {
    it('should authenticate via header and create user', async () => {
      // Make request with header auth
      const response = await testUtils
        .httpServer()
        .get('/auth/status')
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
      // Without auth header
      const response1 = await testUtils.httpServer().get('/datasources');
      expect(response1.status).toBe(401);

      // With auth header
      const response2 = await testUtils
        .httpServer()
        .get('/datasources')
        .set('X-User-Id', 'e2e-test-456');

      expect(response2.status).toBe(200);
    });

    it('should reject disabled users', async () => {
      // Create disabled user
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _disabledUser = await User.create({
        uid: 'header:e2e-disabled',
        provider: 'header',
        username: 'Disabled User',
        isActive: false,
      });

      const response = await testUtils
        .httpServer()
        .get('/auth/status')
        .set('X-User-Id', 'e2e-disabled');

      expect(response.status).toBe(403);
    });
  });

  describe('Creator/Updater Tracking', () => {
    it('should automatically set creator_id and updater_id', async () => {
      // Authenticate first
      const authResponse = await testUtils
        .httpServer()
        .post('/datasources')
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

      expect(datasource.creator_id).toBe(user.id);
      expect(datasource.updater_id).toBe(user.id);
    });
  });
});
