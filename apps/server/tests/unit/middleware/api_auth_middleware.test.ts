import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import ApiAuthMiddleware from '../../../app/middleware/api_auth_middleware.js';
import { AccessTokenGuard } from '#guards/access_token_guard';
import type { AuthManager } from '../../../app/services/auth_manager.js';
import type User from '#models/user';

interface MockResponse {
  statusCode: number;
  payload: unknown;
  forbidden: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  internalServerError: (payload: unknown) => unknown;
}

const user = {
  id: 1,
  username: 'admin',
  isActive: true,
} as User;

const createResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    payload: undefined,
    forbidden(payload) {
      response.statusCode = 403;
      response.payload = payload;
      return payload;
    },
    unauthorized(payload) {
      response.statusCode = 401;
      response.payload = payload;
      return payload;
    },
    internalServerError(payload) {
      response.statusCode = 500;
      response.payload = payload;
      return payload;
    },
  };
  return response;
};

const createContext = ({
  method = 'POST',
  headers = {},
  sessionCookie,
  ip = '127.0.0.1',
}: {
  method?: string;
  headers?: Record<string, string>;
  sessionCookie?: string;
  ip?: string;
}): HttpContext => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const response = createResponse();

  return {
    request: {
      method: () => method,
      header: vi.fn((name: string) => normalizedHeaders[name.toLowerCase()] ?? null),
      cookie: vi.fn((name: string) => (name === 'sparkset_session' ? sessionCookie : null)),
      ip: () => ip,
      url: () => '/datasources',
    },
    response,
  } as unknown as HttpContext;
};

const createAuthManager = (authenticatedUser: User | null) =>
  ({
    authenticate: vi.fn().mockResolvedValue(authenticatedUser),
  }) as unknown as AuthManager;

describe('ApiAuthMiddleware browser session origin checks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'http://localhost:3001');
    vi.spyOn(AccessTokenGuard.prototype, 'authenticate').mockResolvedValue(user);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('rejects unsafe cookie-session requests from untrusted origins', async () => {
    const ctx = createContext({
      sessionCookie: 'sat_cookie_token',
      headers: { Origin: 'https://evil.example' },
    });
    const next = vi.fn().mockResolvedValue('next');

    const result = await new ApiAuthMiddleware().handle(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(AccessTokenGuard.prototype.authenticate).not.toHaveBeenCalled();
    expect((ctx.response as unknown as MockResponse).statusCode).toBe(403);
    expect(result).toEqual(
      expect.objectContaining({
        error: 'CSRF_ORIGIN_FORBIDDEN',
      }),
    );
  });

  it('rejects unsafe cookie-session requests without a browser origin', async () => {
    const ctx = createContext({
      sessionCookie: 'sat_cookie_token',
    });
    const next = vi.fn().mockResolvedValue('next');

    const result = await new ApiAuthMiddleware().handle(ctx, next);

    expect(next).not.toHaveBeenCalled();
    expect(AccessTokenGuard.prototype.authenticate).not.toHaveBeenCalled();
    expect((ctx.response as unknown as MockResponse).statusCode).toBe(403);
    expect(result).toEqual(
      expect.objectContaining({
        error: 'CSRF_ORIGIN_FORBIDDEN',
      }),
    );
  });

  it('allows unsafe cookie-session requests from trusted origins', async () => {
    const ctx = createContext({
      sessionCookie: 'sat_cookie_token',
      headers: { Origin: 'http://localhost:3001' },
    });
    const next = vi.fn().mockResolvedValue('next');

    const result = await new ApiAuthMiddleware().handle(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(result).toBe('next');
  });

  it('does not require browser origins for bearer-token API clients', async () => {
    const ctx = createContext({
      headers: { Authorization: 'Bearer sat_api_token' },
    });
    const next = vi.fn().mockResolvedValue('next');

    const result = await new ApiAuthMiddleware().handle(ctx, next);

    expect(next).toHaveBeenCalled();
    expect(result).toBe('next');
  });

  it('accepts authenticated header provider users before token guard fallback', async () => {
    const headerUser = {
      id: 2,
      username: 'ada',
      isActive: true,
    } as User;
    const authManager = createAuthManager(headerUser);
    const ctx = createContext({
      method: 'GET',
      headers: { 'X-User-Id': 'ada' },
    });
    const next = vi.fn().mockResolvedValue('next');

    const result = await new ApiAuthMiddleware(authManager).handle(ctx, next);

    expect(AccessTokenGuard.prototype.authenticate).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect((ctx as unknown as { auth: { user: User } }).auth.user).toBe(headerUser);
    expect(result).toBe('next');
  });

  it('rejects disabled users authenticated by a header provider', async () => {
    const authManager = createAuthManager({
      id: 2,
      username: 'ada',
      isActive: false,
    } as User);
    const ctx = createContext({
      method: 'GET',
      headers: { 'X-User-Id': 'ada' },
    });
    const next = vi.fn().mockResolvedValue('next');

    const result = await new ApiAuthMiddleware(authManager).handle(ctx, next);

    expect(AccessTokenGuard.prototype.authenticate).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect((ctx.response as unknown as MockResponse).statusCode).toBe(403);
    expect(result).toEqual(
      expect.objectContaining({
        error: 'User account disabled',
      }),
    );
  });
});
