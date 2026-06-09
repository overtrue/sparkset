import { describe, expect, it } from 'vitest';
import { LocalLoginAttemptLimiter } from '../../../app/services/local_login_attempt_limiter.js';

describe('LocalLoginAttemptLimiter', () => {
  it('locks a username and IP key after the configured failed attempts', () => {
    let now = 1_000;
    const limiter = new LocalLoginAttemptLimiter({
      maxAttempts: 2,
      windowSeconds: 60,
      lockSeconds: 120,
      now: () => now,
    });

    expect(limiter.check('Analyst', '10.0.0.1').allowed).toBe(true);
    expect(limiter.recordFailure('Analyst', '10.0.0.1').allowed).toBe(true);

    const locked = limiter.recordFailure(' analyst ', '10.0.0.1');
    expect(locked.allowed).toBe(false);
    expect(locked.retryAfterSeconds).toBe(120);

    now += 30_000;
    expect(limiter.check('ANALYST', '10.0.0.1')).toEqual(
      expect.objectContaining({
        allowed: false,
        retryAfterSeconds: 90,
      }),
    );

    now += 90_000;
    expect(limiter.check('analyst', '10.0.0.1').allowed).toBe(true);
  });

  it('resets failed attempts after a successful login', () => {
    const limiter = new LocalLoginAttemptLimiter({
      maxAttempts: 2,
      windowSeconds: 60,
      lockSeconds: 120,
      now: () => 1_000,
    });

    limiter.recordFailure('analyst', '10.0.0.1');
    limiter.recordSuccess('analyst', '10.0.0.1');

    expect(limiter.recordFailure('analyst', '10.0.0.1').allowed).toBe(true);
  });

  it('can be disabled for deployments that use an external limiter', () => {
    const limiter = new LocalLoginAttemptLimiter({
      maxAttempts: 0,
      windowSeconds: 60,
      lockSeconds: 120,
      now: () => 1_000,
    });

    expect(limiter.recordFailure('analyst', '10.0.0.1').allowed).toBe(true);
    expect(limiter.recordFailure('analyst', '10.0.0.1').allowed).toBe(true);
    expect(limiter.check('analyst', '10.0.0.1').allowed).toBe(true);
  });
});
