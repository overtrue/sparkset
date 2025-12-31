/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AuthMiddleware from '../app/middleware/auth_middleware';
import { AuthManager } from '../app/services/auth_manager';
import { HttpContext } from '@adonisjs/core/http';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let mockAuthManager: AuthManager;
  let mockNext: () => Promise<unknown>;

  beforeEach(() => {
    // Create mock AuthManager
    mockAuthManager = {
      authenticate: vi.fn(),
    } as unknown as AuthManager;

    middleware = new AuthMiddleware(mockAuthManager);
    mockNext = vi.fn().mockResolvedValue('next-result');
  });

  it('should call next() with authenticated user', async () => {
    const ctx = createMockContext(false);
    const mockUser = { id: 1, username: 'test', isActive: true };
    vi.mocked(mockAuthManager.authenticate).mockResolvedValue(mockUser);

    const result = await middleware.handle(ctx, mockNext);

    expect(vi.mocked(mockAuthManager.authenticate)).toHaveBeenCalledWith(ctx);
    expect(ctx.auth?.user).toBe(mockUser);
    expect(mockNext).toHaveBeenCalled();
    expect(result).toBe('next-result');
  });

  it('should return 401 for unauthenticated request', async () => {
    const ctx = createMockContext(false);
    vi.mocked(mockAuthManager.authenticate).mockResolvedValue(null);

    await middleware.handle(ctx, mockNext);

    expect(vi.mocked(mockAuthManager.authenticate)).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(ctx.response.status).toBe(401);
  });

  it('should return 401 with JSON for AJAX request', async () => {
    const ctx = createMockContext(true);
    vi.mocked(mockAuthManager.authenticate).mockResolvedValue(null);

    const result = await middleware.handle(ctx, mockNext);

    expect(ctx.response.status).toBe(401);
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('message');
  });

  it('should return 403 for disabled user', async () => {
    const ctx = createMockContext(false);
    const disabledUser = { id: 1, username: 'test', isActive: false };
    vi.mocked(mockAuthManager.authenticate).mockResolvedValue(disabledUser);

    await middleware.handle(ctx, mockNext);

    expect(vi.mocked(mockAuthManager.authenticate)).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(ctx.response.status).toBe(403);
  });

  it('should handle errors from auth manager', async () => {
    const ctx = createMockContext(false);
    vi.mocked(mockAuthManager.authenticate).mockRejectedValue(new Error('Auth failed'));

    await expect(middleware.handle(ctx, mockNext)).rejects.toThrow('Auth failed');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should work with JSON Accept header', async () => {
    const ctx = createMockContext(false, { Accept: 'application/json' });
    vi.mocked(mockAuthManager.authenticate).mockResolvedValue(null);

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
      redirect: function (path: string) {
        this.status = 302;
        return { redirect: path };
      },
    },
    auth: undefined,
  } as unknown as HttpContext;
}
