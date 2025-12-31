import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import AuthMiddleware from '../app/middleware/auth_middleware';
import { AuthManager } from '../app/services/auth_manager';
import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let mockAuthenticate: Mock<(ctx: HttpContext) => Promise<User | null>>;
  let mockNext: () => Promise<unknown>;

  beforeEach(() => {
    middleware = new AuthMiddleware();
    // Mock the authenticate method on the AuthManager instance
    const authManager = (middleware as unknown as { authManager: AuthManager }).authManager;
    mockAuthenticate = vi.fn<(ctx: HttpContext) => Promise<User | null>>();
    authManager.authenticate = mockAuthenticate;
    mockNext = vi.fn().mockResolvedValue('next-result');
  });

  it('should call next() with authenticated user', async () => {
    const ctx = createMockContext(false);
    const mockUser = {
      id: 1,
      username: 'test',
      isActive: true,
      uid: 'test:1',
      provider: 'local' as const,
      email: null,
      displayName: null,
      passwordHash: null,
      roles: [],
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAuthenticate.mockResolvedValue(mockUser as unknown as User);

    const result = await middleware.handle(ctx, mockNext);

    expect(mockAuthenticate).toHaveBeenCalledWith(ctx);
    expect((ctx as { auth?: { user: User } }).auth?.user).toBe(mockUser);
    expect(mockNext).toHaveBeenCalled();
    expect(result).toBe('next-result');
  });

  it('should return 401 for unauthenticated request', async () => {
    const ctx = createMockContext(false);
    mockAuthenticate.mockResolvedValue(null);

    await middleware.handle(ctx, mockNext);

    expect(mockAuthenticate).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(ctx.response.status).toBe(401);
  });

  it('should return 401 with JSON for AJAX request', async () => {
    const ctx = createMockContext(true);
    mockAuthenticate.mockResolvedValue(null);

    const result = await middleware.handle(ctx, mockNext);

    expect(ctx.response.status).toBe(401);
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('message');
  });

  it('should return 403 for disabled user', async () => {
    const ctx = createMockContext(false);
    const disabledUser = {
      id: 1,
      username: 'test',
      isActive: false,
      uid: 'test:1',
      provider: 'local' as const,
      email: null,
      displayName: null,
      passwordHash: null,
      roles: [],
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAuthenticate.mockResolvedValue(disabledUser as unknown as User);

    await middleware.handle(ctx, mockNext);

    expect(mockAuthenticate).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(ctx.response.status).toBe(403);
  });

  it('should handle errors from auth manager', async () => {
    const ctx = createMockContext(false);
    mockAuthenticate.mockRejectedValue(new Error('Auth failed'));

    const result = await middleware.handle(ctx, mockNext);
    // Middleware catches errors and returns 500 response
    expect(result).toHaveProperty('error', 'Authentication error');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should work with JSON Accept header', async () => {
    const ctx = createMockContext(false, { Accept: 'application/json' });
    mockAuthenticate.mockResolvedValue(null);

    await middleware.handle(ctx, mockNext);

    expect(ctx.response.status).toBe(401);
  });
});

function createMockContext(isAjax: boolean, headers: Record<string, string> = {}): HttpContext {
  return {
    request: {
      header: (name: string) => {
        if (name === 'X-Requested-With' && isAjax) return 'XMLHttpRequest';
        if (name === 'Accept' && headers['Accept']) return headers['Accept'];
        return null;
      },
      is: (types: string[]) => {
        if (types.includes('json') && headers['Accept']?.includes('application/json')) return true;
        return false;
      },
    },
    response: {
      status: 0,
      unauthorized: function (data: Record<string, unknown>) {
        this.status = 401;
        return data;
      },
      forbidden: function (data: Record<string, unknown>) {
        this.status = 403;
        return data;
      },
      internalServerError: function (data: Record<string, unknown>) {
        this.status = 500;
        return data;
      },
      redirect: function (path: string) {
        this.status = 302;
        return { redirect: path };
      },
    },
    auth: undefined,
  } as unknown as HttpContext;
}
