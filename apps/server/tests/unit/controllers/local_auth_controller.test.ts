import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import LocalAuthController from '../../../app/controllers/local_auth_controller.js';
import User from '#models/user';
import { AccessTokenGuard } from '#guards/access_token_guard';
import { AuditLogService } from '../../../app/services/audit_log_service.js';
import { LocalLoginAttemptLimiter } from '../../../app/services/local_login_attempt_limiter.js';

const bcryptMock = vi.hoisted(() => ({
  compare: vi.fn(),
  hash: vi.fn(),
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
  status: (code: number) => { send: (payload: unknown) => unknown };
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
    status(code) {
      response.statusCode = code;
      return {
        send(payload) {
          response.payload = payload;
          return payload;
        },
      };
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
  headers = {},
}: {
  body?: Record<string, unknown>;
  sessionCookie?: string;
  response: MockResponse;
  headers?: Record<string, string>;
}): HttpContext => {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    request: {
      body: () => body ?? {},
      header: vi.fn((name: string) => normalizedHeaders[name.toLowerCase()] ?? null),
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
    bcryptMock.hash.mockReset();
    vi.spyOn(AuditLogService.prototype, 'recordHttp').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sets an httpOnly session cookie without returning token after a successful local login', async () => {
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
    const audit = {
      recordHttp: vi.fn().mockResolvedValue(undefined),
    };
    const response = createMockResponse();

    const result = await new LocalAuthController(audit as unknown as AuditLogService).login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'secret123' },
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        authenticated: true,
      }),
    );
    expect(result).not.toHaveProperty('token');
    expect(response.cookie).toHaveBeenCalledWith(
      'sparkset_session',
      'sat_login_token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
    expect(audit.recordHttp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: 1,
        action: 'auth.login',
        outcome: 'success',
        resourceType: 'user',
        resourceId: '1',
      }),
    );
  });

  it('rejects local login from an untrusted browser origin', async () => {
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'http://localhost:3001');
    const response = createMockResponse();

    const result = await new LocalAuthController().login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'secret123' },
        headers: { Origin: 'https://evil.example' },
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        error: 'CSRF_ORIGIN_FORBIDDEN',
      }),
    );
    expect(response.statusCode).toBe(403);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it('records an audit event for unknown local login usernames', async () => {
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(null) as never);
    const audit = {
      recordHttp: vi.fn().mockResolvedValue(undefined),
    };
    const response = createMockResponse();

    await new LocalAuthController(audit as unknown as AuditLogService).login(
      createMockContext({
        response,
        body: { username: 'missing-user', password: 'secret123' },
      }),
    );

    expect(response.statusCode).toBe(401);
    expect(audit.recordHttp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: null,
        action: 'auth.login',
        outcome: 'failure',
        resourceType: 'user',
        resourceId: null,
        metadata: expect.objectContaining({
          username: 'missing-user',
          reason: 'unknown_user',
        }),
      }),
    );
    expect(JSON.stringify((audit.recordHttp.mock.calls[0] ?? [])[1])).not.toContain('secret123');
  });

  it('returns 429 for locked local login attempts without verifying the password', async () => {
    const limiter = {
      check: vi.fn(() => ({ allowed: false, retryAfterSeconds: 60 })),
      recordFailure: vi.fn(),
      recordSuccess: vi.fn(),
    };
    const audit = {
      recordHttp: vi.fn().mockResolvedValue(undefined),
    };
    const response = createMockResponse();
    const userQuery = vi.spyOn(User, 'query');

    const result = await new LocalAuthController(
      audit as unknown as AuditLogService,
      limiter as unknown as LocalLoginAttemptLimiter,
    ).login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'secret123' },
      }),
    );

    expect(response.statusCode).toBe(429);
    expect(result).toEqual({
      error: 'AUTH_RATE_LIMITED',
      message: '登录尝试过于频繁，请稍后再试',
      retryAfterSeconds: 60,
    });
    expect(userQuery).not.toHaveBeenCalled();
    expect(bcryptMock.compare).not.toHaveBeenCalled();
    expect(audit.recordHttp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: null,
        action: 'auth.login',
        outcome: 'failure',
        resourceType: 'user',
        resourceId: null,
        metadata: expect.objectContaining({
          username: 'analyst',
          reason: 'rate_limited',
          retryAfterSeconds: 60,
        }),
      }),
    );
    expect(JSON.stringify((audit.recordHttp.mock.calls[0] ?? [])[1])).not.toContain('secret123');
  });

  it('records a failed local login attempt when the password is invalid', async () => {
    const user = {
      id: 1,
      username: 'analyst',
      passwordHash: 'hashed-password',
      isActive: true,
    };
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(user) as never);
    bcryptMock.compare.mockResolvedValue(false);
    const limiter = {
      check: vi.fn(() => ({ allowed: true })),
      recordFailure: vi.fn(() => ({ allowed: true })),
      recordSuccess: vi.fn(),
    };
    const response = createMockResponse();

    await new LocalAuthController(
      { recordHttp: vi.fn().mockResolvedValue(undefined) } as unknown as AuditLogService,
      limiter as unknown as LocalLoginAttemptLimiter,
    ).login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'wrong-password' },
      }),
    );

    expect(response.statusCode).toBe(401);
    expect(limiter.recordFailure).toHaveBeenCalledWith('analyst', null);
    expect(limiter.recordSuccess).not.toHaveBeenCalled();
  });

  it('clears failed local login attempts after a successful login', async () => {
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
    const limiter = {
      check: vi.fn(() => ({ allowed: true })),
      recordFailure: vi.fn(),
      recordSuccess: vi.fn(),
    };
    const response = createMockResponse();

    await new LocalAuthController(
      { recordHttp: vi.fn().mockResolvedValue(undefined) } as unknown as AuditLogService,
      limiter as unknown as LocalLoginAttemptLimiter,
    ).login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'secret123' },
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(limiter.recordSuccess).toHaveBeenCalledWith('analyst', null);
    expect(limiter.recordFailure).not.toHaveBeenCalled();
  });

  it('records an audit event for invalid local login passwords', async () => {
    const user = {
      id: 1,
      username: 'analyst',
      passwordHash: 'hashed-password',
      isActive: true,
    };
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(user) as never);
    bcryptMock.compare.mockResolvedValue(false);
    const audit = {
      recordHttp: vi.fn().mockResolvedValue(undefined),
    };
    const response = createMockResponse();

    await new LocalAuthController(audit as unknown as AuditLogService).login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'wrong-password' },
      }),
    );

    expect(response.statusCode).toBe(401);
    expect(audit.recordHttp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: 1,
        action: 'auth.login',
        outcome: 'failure',
        resourceType: 'user',
        resourceId: '1',
        metadata: expect.objectContaining({
          username: 'analyst',
          reason: 'invalid_password',
        }),
      }),
    );
    expect(JSON.stringify((audit.recordHttp.mock.calls[0] ?? [])[1])).not.toContain(
      'wrong-password',
    );
  });

  it('records an audit event for disabled local login accounts', async () => {
    const user = {
      id: 1,
      username: 'analyst',
      passwordHash: 'hashed-password',
      isActive: false,
    };
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(user) as never);
    bcryptMock.compare.mockResolvedValue(true);
    const audit = {
      recordHttp: vi.fn().mockResolvedValue(undefined),
    };
    const response = createMockResponse();

    await new LocalAuthController(audit as unknown as AuditLogService).login(
      createMockContext({
        response,
        body: { username: 'analyst', password: 'secret123' },
      }),
    );

    expect(response.statusCode).toBe(403);
    expect(audit.recordHttp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorUserId: 1,
        action: 'auth.login',
        outcome: 'failure',
        resourceType: 'user',
        resourceId: '1',
        metadata: expect.objectContaining({
          username: 'analyst',
          reason: 'account_disabled',
        }),
      }),
    );
    expect(JSON.stringify((audit.recordHttp.mock.calls[0] ?? [])[1])).not.toContain('secret123');
  });

  it('sets an httpOnly session cookie without returning token after local registration', async () => {
    const user = {
      id: 2,
      username: 'newuser',
      email: 'newuser@example.com',
      displayName: 'New User',
      roles: ['viewer'],
      permissions: [],
      provider: 'local',
      passwordHash: 'hashed-password',
      isActive: true,
    };
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(null) as never);
    vi.spyOn(User, 'create').mockResolvedValue(user as never);
    bcryptMock.hash.mockResolvedValue('hashed-password');
    vi.spyOn(AccessTokenGuard.prototype, 'generateToken').mockResolvedValue({
      token: 'sat_register_token',
      accessToken: {} as Awaited<ReturnType<AccessTokenGuard['generateToken']>>['accessToken'],
    });
    const response = createMockResponse();

    const result = await new LocalAuthController().register(
      createMockContext({
        response,
        body: {
          username: 'newuser',
          password: 'secret123',
          email: 'newuser@example.com',
          displayName: 'New User',
        },
      }),
    );

    expect(result).toEqual(expect.objectContaining({ authenticated: true }));
    expect(result).not.toHaveProperty('token');
    expect(response.cookie).toHaveBeenCalledWith(
      'sparkset_session',
      'sat_register_token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('rejects local registration when registration is disabled by configuration', async () => {
    vi.stubEnv('AUTH_LOCAL_ALLOW_REGISTRATION', 'false');
    vi.spyOn(User, 'query').mockReturnValue(createUserQuery(null) as never);
    vi.spyOn(User, 'create').mockResolvedValue({
      id: 99,
      username: 'newuser',
      email: 'newuser@example.com',
      displayName: 'newuser',
      roles: ['viewer'],
      permissions: [],
      provider: 'local',
      passwordHash: 'hashed-password',
      isActive: true,
    } as never);
    bcryptMock.hash.mockResolvedValue('hashed-password');
    vi.spyOn(AccessTokenGuard.prototype, 'generateToken').mockResolvedValue({
      token: 'sat_register_token',
      accessToken: {} as Awaited<ReturnType<AccessTokenGuard['generateToken']>>['accessToken'],
    });
    const response = createMockResponse();

    await new LocalAuthController().register(
      createMockContext({
        response,
        body: {
          username: 'newuser',
          password: 'secret123',
          email: 'newuser@example.com',
        },
      }),
    );

    expect(response.statusCode).toBe(403);
    expect(response.payload).toEqual(
      expect.objectContaining({
        error: 'REGISTRATION_DISABLED',
      }),
    );
    expect(User.create).not.toHaveBeenCalled();
    expect(response.cookie).not.toHaveBeenCalled();
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

  it('refreshes the session cookie without returning token in the response body', async () => {
    const user = {
      id: 1,
      username: 'analyst',
      email: 'analyst@example.com',
      displayName: 'Analyst',
      roles: ['admin'],
      permissions: ['datasource:view'],
      provider: 'local',
      isActive: true,
    };
    vi.spyOn(AccessTokenGuard.prototype, 'authenticate').mockResolvedValue(user as never);
    vi.spyOn(AccessTokenGuard.prototype, 'revokeToken').mockResolvedValue(undefined);
    vi.spyOn(AccessTokenGuard.prototype, 'generateToken').mockResolvedValue({
      token: 'sat_refreshed_token',
      accessToken: {} as Awaited<ReturnType<AccessTokenGuard['generateToken']>>['accessToken'],
    });
    const response = createMockResponse();

    const result = await new LocalAuthController().refresh(
      createMockContext({
        response,
        sessionCookie: 'sat_old_token',
      }),
    );

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(result).not.toHaveProperty('token');
    expect(AccessTokenGuard.prototype.revokeToken).toHaveBeenCalledWith('sat_old_token');
    expect(response.cookie).toHaveBeenCalledWith(
      'sparkset_session',
      'sat_refreshed_token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });
});
