import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import { AccessTokenGuard } from '../../../app/guards/access_token_guard.js';

const createContext = ({
  authorization,
  accessTokenHeader,
  sessionCookie,
}: {
  authorization?: string;
  accessTokenHeader?: string;
  sessionCookie?: string;
} = {}): HttpContext => {
  const headers: Record<string, string | undefined> = {
    authorization,
    'x-access-token': accessTokenHeader,
  };

  return {
    request: {
      header: vi.fn((name: string) => headers[name.toLowerCase()] ?? null),
      cookie: vi.fn((name: string) => (name === 'sparkset_session' ? sessionCookie : null)),
    },
  } as unknown as HttpContext;
};

describe('AccessTokenGuard request token extraction', () => {
  it('reads the access token from the httpOnly session cookie', () => {
    const guard = new AccessTokenGuard(createContext({ sessionCookie: 'sat_cookie_token' }));

    expect(guard.getRequestToken()).toBe('sat_cookie_token');
  });

  it('keeps Authorization header precedence over the session cookie', () => {
    const guard = new AccessTokenGuard(
      createContext({
        authorization: 'Bearer sat_header_token',
        sessionCookie: 'sat_cookie_token',
      }),
    );

    expect(guard.getRequestToken()).toBe('sat_header_token');
  });
});
