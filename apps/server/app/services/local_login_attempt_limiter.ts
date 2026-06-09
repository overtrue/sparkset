export interface LocalLoginAttemptLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface LocalLoginAttemptLimiterOptions {
  maxAttempts?: number;
  windowSeconds?: number;
  lockSeconds?: number;
  now?: () => number;
}

interface LoginAttemptEntry {
  failedAttempts: number;
  windowStartedAt: number;
  lockedUntil: number | null;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_LOCK_SECONDS = 15 * 60;
const UNKNOWN_IP = 'unknown-ip';

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return parsed;
};

export class LocalLoginAttemptLimiter {
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly lockMs: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, LoginAttemptEntry>();

  constructor(options: LocalLoginAttemptLimiterOptions = {}) {
    this.maxAttempts =
      options.maxAttempts ??
      parsePositiveInteger(process.env.AUTH_LOCAL_LOGIN_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
    this.windowMs =
      (options.windowSeconds ??
        parsePositiveInteger(process.env.AUTH_LOCAL_LOGIN_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS)) *
      1_000;
    this.lockMs =
      (options.lockSeconds ??
        parsePositiveInteger(process.env.AUTH_LOCAL_LOGIN_LOCK_SECONDS, DEFAULT_LOCK_SECONDS)) *
      1_000;
    this.now = options.now ?? (() => Date.now());
  }

  check(username: string, ipAddress?: string | null): LocalLoginAttemptLimitResult {
    if (!this.enabled()) return { allowed: true };

    const key = this.buildKey(username, ipAddress);
    const entry = this.getActiveEntry(key);
    if (!entry?.lockedUntil) return { allowed: true };

    return this.lockedResult(entry.lockedUntil);
  }

  recordFailure(username: string, ipAddress?: string | null): LocalLoginAttemptLimitResult {
    if (!this.enabled()) return { allowed: true };

    const key = this.buildKey(username, ipAddress);
    const now = this.now();
    const entry = this.getActiveEntry(key) ?? {
      failedAttempts: 0,
      windowStartedAt: now,
      lockedUntil: null,
    };

    if (entry.lockedUntil && entry.lockedUntil > now) {
      return this.lockedResult(entry.lockedUntil);
    }

    entry.failedAttempts += 1;
    entry.lockedUntil = entry.failedAttempts >= this.maxAttempts ? now + this.lockMs : null;
    this.entries.set(key, entry);

    if (entry.lockedUntil) return this.lockedResult(entry.lockedUntil);
    return { allowed: true };
  }

  recordSuccess(username: string, ipAddress?: string | null): void {
    this.entries.delete(this.buildKey(username, ipAddress));
  }

  private enabled(): boolean {
    return this.maxAttempts > 0 && this.windowMs > 0 && this.lockMs > 0;
  }

  private getActiveEntry(key: string): LoginAttemptEntry | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    const now = this.now();
    if (entry.lockedUntil && entry.lockedUntil > now) return entry;

    if (entry.lockedUntil || now - entry.windowStartedAt >= this.windowMs) {
      this.entries.delete(key);
      return null;
    }

    return entry;
  }

  private lockedResult(lockedUntil: number): LocalLoginAttemptLimitResult {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil - this.now()) / 1_000)),
    };
  }

  private buildKey(username: string, ipAddress?: string | null): string {
    return `${username.trim().toLowerCase()}:${ipAddress ?? UNKNOWN_IP}`;
  }
}
