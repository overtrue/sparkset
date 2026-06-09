import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  allowTrustedCorsOrigin,
  getTrustedBrowserOrigins,
  isTrustedOrigin,
} from '../../../app/security/browser_origins.js';

describe('trusted browser origins', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows explicitly trusted browser origins for credentialed CORS', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv(
      'AUTH_TRUSTED_ORIGINS',
      'https://dashboard.example.com, http://localhost:3001/dashboard',
    );

    expect(allowTrustedCorsOrigin('https://dashboard.example.com')).toBe(true);
    expect(allowTrustedCorsOrigin('http://localhost:3001')).toBe(true);
  });

  it('rejects untrusted and invalid browser origins for credentialed CORS', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', 'https://dashboard.example.com');

    expect(allowTrustedCorsOrigin('https://evil.example')).toBe(false);
    expect(allowTrustedCorsOrigin('not a url')).toBe(false);
  });

  it('keeps localhost dashboard origins trusted in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_TRUSTED_ORIGINS', '');

    expect(isTrustedOrigin('http://localhost:3000')).toBe(true);
    expect(isTrustedOrigin('http://127.0.0.1:3001')).toBe(true);
    expect(getTrustedBrowserOrigins()).toContain('http://localhost:3000');
  });
});
