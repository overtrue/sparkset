import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HeaderAuthProvider } from '../app/providers/header_auth_provider';
import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';

// Mock User model
vi.mock('#models/user', () => ({
  default: {
    firstOrCreate: vi.fn(),
  },
}));

describe('HeaderAuthProvider', () => {
  let provider: HeaderAuthProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    provider = new HeaderAuthProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('enabled()', () => {
    it('should return true when AUTH_HEADER_ENABLED is true', () => {
      process.env.AUTH_HEADER_ENABLED = 'true';
      expect(provider.enabled()).toBe(true);
    });

    it('should return false when AUTH_HEADER_ENABLED is not set', () => {
      delete process.env.AUTH_HEADER_ENABLED;
      expect(provider.enabled()).toBe(false);
    });

    it('should return false when AUTH_HEADER_ENABLED is false', () => {
      process.env.AUTH_HEADER_ENABLED = 'false';
      expect(provider.enabled()).toBe(false);
    });
  });

  describe('canHandle()', () => {
    it('should return false if not enabled', () => {
      process.env.AUTH_HEADER_ENABLED = 'false';
      const ctx = createMockContext('127.0.0.1', { 'X-User-Id': '123' });
      expect(provider.canHandle(ctx)).toBe(false);
    });

    it('should return false if IP not in trusted proxies', () => {
      process.env.AUTH_HEADER_ENABLED = 'true';
      process.env.AUTH_HEADER_TRUSTED_PROXIES = '10.0.0.0/8';
      const ctx = createMockContext('192.168.1.1', { 'X-User-Id': '123' });
      expect(provider.canHandle(ctx)).toBe(false);
    });

    it('should return false if required header missing', () => {
      process.env.AUTH_HEADER_ENABLED = 'true';
      const ctx = createMockContext('127.0.0.1', {});
      expect(provider.canHandle(ctx)).toBe(false);
    });

    it('should return true with valid request', () => {
      process.env.AUTH_HEADER_ENABLED = 'true';
      const ctx = createMockContext('127.0.0.1', { 'X-User-Id': '123' });
      expect(provider.canHandle(ctx)).toBe(true);
    });

    it('should work with CIDR notation', () => {
      process.env.AUTH_HEADER_ENABLED = 'true';
      process.env.AUTH_HEADER_TRUSTED_PROXIES = '10.0.0.0/8,172.16.0.0/12';

      const ctx1 = createMockContext('10.1.2.3', { 'X-User-Id': '123' });
      const ctx2 = createMockContext('172.16.1.1', { 'X-User-Id': '123' });
      const ctx3 = createMockContext('192.168.1.1', { 'X-User-Id': '123' });

      expect(provider.canHandle(ctx1)).toBe(true);
      expect(provider.canHandle(ctx2)).toBe(true);
      expect(provider.canHandle(ctx3)).toBe(false);
    });
  });

  describe('authenticate()', () => {
    it('should return null if cannot handle', async () => {
      process.env.AUTH_HEADER_ENABLED = 'false';
      const ctx = createMockContext('127.0.0.1', { 'X-User-Id': '123' });
      const result = await provider.authenticate(ctx);
      expect(result).toBeNull();
    });

    it('should create new user with all fields', async () => {
      process.env.AUTH_HEADER_ENABLED = 'true';

      const ctx = createMockContext('127.0.0.1', {
        'X-User-Id': '123',
        'X-User-Name': 'zhangsan',
        'X-User-Email': 'zhangsan@example.com',
        'X-User-Roles': 'admin,analyst',
        'X-User-Permissions': 'datasource:read,query:write',
      });

      const mockUser = { id: 1, username: 'zhangsan' };
      User.firstOrCreate = vi.fn().mockResolvedValue(mockUser);

      const result = await provider.authenticate(ctx);

      expect(User.firstOrCreate).toHaveBeenCalledWith(
        { uid: 'header:123' },
        {
          uid: 'header:123',
          provider: 'header',
          username: 'zhangsan',
          email: 'zhangsan@example.com',
          displayName: null,
          roles: ['admin', 'analyst'],
          permissions: ['datasource:read', 'query:write'],
        },
      );
      expect(result).toBe(mockUser);
    });

    it('should handle missing optional fields', async () => {
      process.env.AUTH_HEADER_ENABLED = 'true';

      const ctx = createMockContext('127.0.0.1', {
        'X-User-Id': '456',
      });

      const mockUser = { id: 2, username: '456' };
      User.firstOrCreate = vi.fn().mockResolvedValue(mockUser);

      const result = await provider.authenticate(ctx);

      expect(User.firstOrCreate).toHaveBeenCalledWith(
        { uid: 'header:456' },
        {
          uid: 'header:456',
          provider: 'header',
          username: '456',
          email: null,
          displayName: null,
          roles: [],
          permissions: [],
        },
      );
      expect(result).toBe(mockUser);
    });

    it('should update existing user if fields changed', async () => {
      process.env.AUTH_HEADER_ENABLED = 'true';

      const ctx = createMockContext('127.0.0.1', {
        'X-User-Id': '789',
        'X-User-Name': 'newname',
        'X-User-Email': 'new@example.com',
        'X-User-Roles': 'admin',
      });

      const existingUser = {
        id: 3,
        username: 'oldname',
        email: 'old@example.com',
        roles: ['analyst'],
        permissions: [],
        merge: vi.fn(),
        save: vi.fn(),
      };

      User.firstOrCreate = vi.fn().mockResolvedValue(existingUser);

      await provider.authenticate(ctx);

      expect(existingUser.merge).toHaveBeenCalledWith({
        uid: 'header:789',
        provider: 'header',
        username: 'newname',
        email: 'new@example.com',
        displayName: null,
        roles: ['admin'],
        permissions: [],
      });
      expect(existingUser.save).toHaveBeenCalled();
    });

    it('should handle custom header prefix', async () => {
      process.env.AUTH_HEADER_ENABLED = 'true';
      process.env.AUTH_HEADER_PREFIX = 'Custom-';

      const ctx = createMockContext('127.0.0.1', {
        'Custom-Id': '999',
        'Custom-Name': 'custom',
      });

      const mockUser = { id: 4, username: 'custom' };
      User.firstOrCreate = vi.fn().mockResolvedValue(mockUser);

      await provider.authenticate(ctx);

      expect(User.firstOrCreate).toHaveBeenCalledWith(
        { uid: 'header:999' },
        expect.objectContaining({
          username: 'custom',
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      process.env.AUTH_HEADER_ENABLED = 'true';

      const ctx = createMockContext('127.0.0.1', { 'X-User-Id': '123' });
      User.firstOrCreate = vi.fn().mockRejectedValue(new Error('Database error'));

      const result = await provider.authenticate(ctx);
      expect(result).toBeNull();
    });
  });
});

// Helper function to create mock HttpContext
function createMockContext(ip: string, headers: Record<string, string>): HttpContext {
  return {
    request: {
      ip,
      header: (name: string) => headers[name] || null,
    },
    response: {},
  } as unknown as HttpContext;
}
