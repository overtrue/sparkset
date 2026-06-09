import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import OIDCAuthController from '../../../app/controllers/oidc_auth_controller.js';
import type { OIDCAuthConfig } from '../../../app/types/auth.js';
import User from '#models/user';
import { AccessTokenGuard } from '#guards/access_token_guard';

interface CookieRecord {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  cookies: CookieRecord[];
  clearedCookies: { name: string; options?: Record<string, unknown> }[];
  redirectTo: string | null;
  ok: (payload: unknown) => unknown;
  notFound: (payload: unknown) => unknown;
  status: (statusCode: number) => { send: (payload: unknown) => unknown };
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options?: Record<string, unknown>) => void;
  redirect: (path?: string, forwardQueryString?: boolean, statusCode?: number) => unknown;
}

function oidcConfig(overrides: Partial<OIDCAuthConfig> = {}): OIDCAuthConfig {
  return {
    enabled: true,
    issuer: 'https://identity.example.test/realms/main',
    authorizationUrl: 'https://identity.example.test/realms/main/protocol/openid-connect/auth',
    tokenUrl: 'https://identity.example.test/realms/main/protocol/openid-connect/token',
    jwksUrl: 'https://identity.example.test/realms/main/protocol/openid-connect/certs',
    clientId: 'sparkset',
    clientSecret: 'client-secret',
    redirectUri: 'https://sparkset.example.test/auth/oidc/callback',
    successRedirectUrl: 'https://dashboard.example.test/dashboard',
    failureRedirectUrl: 'https://dashboard.example.test/login?error=oidc',
    scopes: ['openid', 'profile', 'email'],
    claimMapping: {
      uid: 'sub',
      username: 'preferred_username',
      email: 'email',
      roles: 'roles',
      permissions: 'permissions',
    },
    ...overrides,
  };
}

function createMockResponse(): MockResponse {
  const response: MockResponse = {
    statusCode: 200,
    payload: undefined,
    cookies: [],
    clearedCookies: [],
    redirectTo: null,
    ok(payload) {
      response.statusCode = 200;
      response.payload = payload;
      return payload;
    },
    notFound(payload) {
      response.statusCode = 404;
      response.payload = payload;
      return payload;
    },
    status(statusCode) {
      response.statusCode = statusCode;
      return {
        send(payload) {
          response.payload = payload;
          return payload;
        },
      };
    },
    cookie(name, value, options) {
      response.cookies.push({ name, value, options });
    },
    clearCookie(name, options) {
      response.clearedCookies.push({ name, options });
    },
    redirect(path, _forwardQueryString, statusCode) {
      if (path) {
        response.statusCode = statusCode ?? 302;
        response.redirectTo = path;
        return undefined;
      }

      return {
        toPath(target: string) {
          response.statusCode = 302;
          response.redirectTo = target;
          return undefined;
        },
      };
    },
  };
  return response;
}

function createMockContext(
  response: MockResponse,
  {
    query = {},
    cookies = {},
  }: {
    query?: Record<string, string | undefined>;
    cookies?: Record<string, string | undefined>;
  } = {},
): HttpContext {
  return {
    request: {
      input: vi.fn((name: string) => query[name]),
      cookie: vi.fn((name: string) => cookies[name] ?? null),
      header: vi.fn(() => null),
      ip: vi.fn(() => '127.0.0.1'),
    },
    response,
  } as unknown as HttpContext;
}

describe('OIDCAuthController', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fails closed when OIDC is disabled', async () => {
    const response = createMockResponse();
    const controller = new OIDCAuthController(oidcConfig({ enabled: false }));

    await controller.authorizationUrl(createMockContext(response));

    expect(response.statusCode).toBe(404);
    expect(response.payload).toEqual(
      expect.objectContaining({
        error: 'OIDC_DISABLED',
      }),
    );
    expect(response.cookies).toHaveLength(0);
  });

  it('fails closed when required OIDC configuration is missing', async () => {
    const response = createMockResponse();
    const controller = new OIDCAuthController(
      oidcConfig({
        authorizationUrl: undefined,
        clientId: undefined,
        redirectUri: undefined,
      }),
    );

    await controller.authorizationUrl(createMockContext(response));

    expect(response.statusCode).toBe(503);
    expect(response.payload).toEqual(
      expect.objectContaining({
        error: 'OIDC_NOT_CONFIGURED',
        missing: ['authorizationUrl', 'clientId', 'redirectUri'],
      }),
    );
    expect(response.cookies).toHaveLength(0);
  });

  it('returns an authorization URL and stores state and nonce in short-lived httpOnly cookies', async () => {
    const response = createMockResponse();
    const controller = new OIDCAuthController(oidcConfig());

    await controller.authorizationUrl(createMockContext(response));

    expect(response.statusCode).toBe(200);
    const payload = response.payload as { url: string; expiresInSeconds: number };
    const url = new URL(payload.url);
    expect(url.origin + url.pathname).toBe(
      'https://identity.example.test/realms/main/protocol/openid-connect/auth',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('sparkset');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://sparkset.example.test/auth/oidc/callback',
    );
    expect(url.searchParams.get('scope')).toBe('openid profile email');
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('nonce')).toBeTruthy();
    expect(payload.expiresInSeconds).toBe(600);
    expect(response.cookies).toEqual([
      expect.objectContaining({
        name: 'sparkset_oidc_state',
        value: url.searchParams.get('state'),
        options: expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/auth/oidc/callback',
          maxAge: 600,
        }),
      }),
      expect.objectContaining({
        name: 'sparkset_oidc_nonce',
        value: url.searchParams.get('nonce'),
        options: expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/auth/oidc/callback',
          maxAge: 600,
        }),
      }),
    ]);
  });

  it('fails callback closed when state does not match the short-lived cookie', async () => {
    const response = createMockResponse();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await new OIDCAuthController(oidcConfig()).callback(
      createMockContext(response, {
        query: { code: 'auth-code', state: 'returned-state' },
        cookies: {
          sparkset_oidc_state: 'expected-state',
          sparkset_oidc_nonce: 'expected-nonce',
        },
      }),
    );

    expect(response.redirectTo).toBe('https://dashboard.example.test/login?error=oidc');
    expect(response.cookies).toHaveLength(0);
    expect(response.clearedCookies.map((cookie) => cookie.name)).toEqual([
      'sparkset_oidc_state',
      'sparkset_oidc_nonce',
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails callback closed when the ID token cannot be verified', async () => {
    const response = createMockResponse();
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/token')) {
        return new Response(JSON.stringify({ id_token: 'not-a-valid-jwt' }), { status: 200 });
      }

      return new Response(JSON.stringify({ keys: [] }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const firstOrCreateSpy = vi.spyOn(User, 'firstOrCreate');
    const generateTokenSpy = vi.spyOn(AccessTokenGuard.prototype, 'generateToken');

    await new OIDCAuthController(oidcConfig()).callback(
      createMockContext(response, {
        query: { code: 'auth-code', state: 'expected-state' },
        cookies: {
          sparkset_oidc_state: 'expected-state',
          sparkset_oidc_nonce: 'expected-nonce',
        },
      }),
    );

    expect(response.redirectTo).toBe('https://dashboard.example.test/login?error=oidc');
    expect(response.cookies).toHaveLength(0);
    expect(firstOrCreateSpy).not.toHaveBeenCalled();
    expect(generateTokenSpy).not.toHaveBeenCalled();
  });

  it('exchanges a valid callback for an OIDC user session cookie', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const keyId = 'sparkset-test-key';
    const publicJwk = publicKey.export({ format: 'jwk' });
    const idToken = jwt.sign(
      {
        sub: 'user-123',
        preferred_username: 'alice',
        email: 'alice@example.test',
        name: 'Alice Example',
        roles: ['analyst'],
        permissions: ['datasource:view'],
        nonce: 'expected-nonce',
      },
      privateKey,
      {
        algorithm: 'RS256',
        keyid: keyId,
        issuer: 'https://identity.example.test/realms/main',
        audience: 'sparkset',
        expiresIn: '5m',
      },
    );
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/token')) {
        expect(init?.method).toBe('POST');
        const body = init?.body as URLSearchParams;
        expect(body.get('grant_type')).toBe('authorization_code');
        expect(body.get('code')).toBe('auth-code');
        expect(body.get('client_id')).toBe('sparkset');
        expect(body.get('client_secret')).toBe('client-secret');
        expect(body.get('redirect_uri')).toBe('https://sparkset.example.test/auth/oidc/callback');
        return new Response(JSON.stringify({ id_token: idToken }), { status: 200 });
      }

      return new Response(
        JSON.stringify({
          keys: [{ ...publicJwk, kid: keyId, use: 'sig', alg: 'RS256' }],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = {
      id: 42,
      uid: 'oidc:user-123',
      provider: 'oidc',
      username: 'alice',
      email: 'alice@example.test',
      displayName: 'Alice Example',
      roles: ['analyst'],
      permissions: ['datasource:view'],
      isActive: true,
      merge: vi.fn(function merge(this: Record<string, unknown>, values: Record<string, unknown>) {
        Object.assign(this, values);
        return this;
      }),
      save: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(User, 'firstOrCreate').mockResolvedValue(user as unknown as User);
    vi.spyOn(AccessTokenGuard.prototype, 'generateToken').mockResolvedValue({
      token: 'sat_oidc_session',
      accessToken: {} as Awaited<ReturnType<AccessTokenGuard['generateToken']>>['accessToken'],
    });

    const response = createMockResponse();
    await new OIDCAuthController(oidcConfig()).callback(
      createMockContext(response, {
        query: { code: 'auth-code', state: 'expected-state' },
        cookies: {
          sparkset_oidc_state: 'expected-state',
          sparkset_oidc_nonce: 'expected-nonce',
        },
      }),
    );

    expect(User.firstOrCreate).toHaveBeenCalledWith(
      { uid: 'oidc:user-123' },
      expect.objectContaining({
        uid: 'oidc:user-123',
        provider: 'oidc',
        username: 'alice',
        email: 'alice@example.test',
        displayName: 'Alice Example',
        roles: ['analyst'],
        permissions: ['datasource:view'],
        isActive: true,
      }),
    );
    expect(user.merge).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'alice',
        email: 'alice@example.test',
        displayName: 'Alice Example',
        roles: ['analyst'],
        permissions: ['datasource:view'],
      }),
    );
    expect(user.save).toHaveBeenCalled();
    expect(response.cookies).toContainEqual(
      expect.objectContaining({
        name: 'sparkset_session',
        value: 'sat_oidc_session',
        options: expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        }),
      }),
    );
    expect(response.redirectTo).toBe('https://dashboard.example.test/dashboard');
    expect(response.clearedCookies.map((cookie) => cookie.name)).toEqual([
      'sparkset_oidc_state',
      'sparkset_oidc_nonce',
    ]);
  });
});
