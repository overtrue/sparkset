import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import LocalAuthController from '../../../app/controllers/local_auth_controller.js';
import User from '#models/user';
import { AccessTokenGuard } from '#guards/access_token_guard';

const bcryptMock = vi.hoisted(() => ({
  compare: vi.fn(),
}));

vi.mock('bcrypt', () => bcryptMock);

interface MockResponse {
  statusCode: number;
  payload: unknown;
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
  badRequest: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  forbidden: (payload: unknown) => unknown;
  conflict: (payload: unknown) => unknown;
  internalServerError: (payload: unknown) => unknown;
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    payload: undefined,
    cookie: vi.fn(),
    clearCookie: vi.fn(),
    badRequest(payload) {
      response.statusCode = 400;
      response.payload = payload;
      return payload;
    },
    unauthorized(payload) {
      response.statusCode = 401;
      response.payload = payload;
      return payload;
    },
    forbidden(payload) {
      response.statusCode = 403;
      response.payload = payload;
      return payload;
    },
    conflict(payload) {
      response.statusCode = 409;
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

const createUserQuery = (user: Record<string, unknown> | null) => {
  const query = {
    where: vi.fn(() => query),
    first: vi.fn().mockResolvedValue(user),
  };

  return query;
};

const createMockContext = ({
  body,
  sessionCookie,
  response,
}: {
  body?: Record<string, unknown>;
  sessionCookie?: string;
  response: MockResponse;
}): HttpContext => {
  return {
    request: {
      body: () => body ?? {},
      header: vi.fn(() => null),
      cookie: vi.fn((name: string) => (name === 'sparkset_session' ? sessionCookie : null)),
    },
    response,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as HttpContext;
};

describe('LocalAuthController session cookies', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    bcryptMock.compare.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets an httpOnly session cookie after a successful local login', async () => {
    const user = {
      id: 1,
      username: 'analyst',
      email: 'analyst@example.com',
      displayName: 'Analyst',
      roles: ['admin'],
      permissions: ['datasource:view'],
      provider: 'local',
      passwordHash: 'hashed-password',
      isActive: true,
    };
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(user) as never);
    bcryptMock.compare.mockResolvedValue(true);
    vi.spyOn(AccessTokenGuard.prototype, 'generateToken').mockResolvedValue({
      token: 'sat_login_token',
      accessToken: {} as Awaited<ReturnType<AccessTokenGuard['generateToken']>>['accessToken'],
    });
    const response = createMockResponse();

    const result = await new LocalAuthController().login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'secret123' },
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        authenticated: true,
        token: 'sat_login_token',
      }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'sparkset_session',
      'sat_login_token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('revokes the cookie token and clears the session cookie on logout', async () => {
    vi.spyOn(AccessTokenGuard.prototype, 'revokeToken').mockResolvedValue(undefined);
    const response = createMockResponse();

    const result = await new LocalAuthController().logout(
      createMockContext({
        response,
        sessionCookie: 'sat_cookie_token',
      }),
    );

    expect(result).toEqual({
      success: true,
      message: '已成功登出',
    });
    expect(AccessTokenGuard.prototype.revokeToken).toHaveBeenCalledWith('sat_cookie_token');
    expect(response.clearCookie).toHaveBeenCalledWith(
      'sparkset_session',
      expect.objectContaining({ path: '/' }),
    );
  });
});
