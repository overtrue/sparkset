import { describe, expect, it } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import OIDCAuthController from '../../../app/controllers/oidc_auth_controller.js';
import type { OIDCAuthConfig } from '../../../app/types/auth.js';

interface CookieRecord {
  name: string;
  value: string;
  options: Record<string, unknown>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  cookies: CookieRecord[];
  ok: (payload: unknown) => unknown;
  notFound: (payload: unknown) => unknown;
  status: (statusCode: number) => { send: (payload: unknown) => unknown };
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
}

function oidcConfig(overrides: Partial<OIDCAuthConfig> = {}): OIDCAuthConfig {
  return {
    enabled: true,
    issuer: 'https://identity.example.test/realms/main',
    authorizationUrl: 'https://identity.example.test/realms/main/protocol/openid-connect/auth',
    clientId: 'sparkset',
    clientSecret: 'client-secret',
    redirectUri: 'https://sparkset.example.test/auth/oidc/callback',
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
  };
  return response;
}

function createMockContext(response: MockResponse): HttpContext {
  return {
    response,
  } as unknown as HttpContext;
}

describe('OIDCAuthController', () => {
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
});
