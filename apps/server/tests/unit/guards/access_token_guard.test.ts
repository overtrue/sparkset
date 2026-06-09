import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';
import { AccessTokenGuard } from '../../../app/guards/access_token_guard.js';
import AccessToken from '../../../app/models/access_token.js';

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
      ip: vi.fn(() => '127.0.0.1'),
    },
  } as unknown as HttpContext;
};

describe('AccessTokenGuard request token extraction', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it('generates expiring tokens by default', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-09T00:00:00.000Z'));
    vi.spyOn(AccessToken, 'create').mockResolvedValue({} as never);
    const guard = new AccessTokenGuard(createContext());

    await guard.generateToken({ id: 7 } as never, 'login');

    expect(AccessToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        identifier: 'login',
        expiresAt: expect.any(DateTime),
      }),
    );
    const payload = vi.mocked(AccessToken.create).mock.calls[0][0] as { expiresAt: DateTime };
    expect(payload.expiresAt.diff(DateTime.now(), 'days').days).toBe(7);
  });
});
