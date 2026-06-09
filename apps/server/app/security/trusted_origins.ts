import type { HttpContext } from '@adonisjs/core/http';
import { ACCESS_TOKEN_SESSION_COOKIE } from '#guards/access_token_guard';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function splitEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function getTrustedBrowserOrigins(): Set<string> {
  const origins = [
    ...splitEnvList(process.env.AUTH_TRUSTED_ORIGINS),
    ...splitEnvList(process.env.APP_URL),
    ...splitEnvList(process.env.DASHBOARD_URL),
    ...splitEnvList(process.env.FRONTEND_URL),
  ];

  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
    );
  }

  return new Set(origins.map(normalizeOrigin).filter((origin): origin is string => !!origin));
}

export function isSafeHttpMethod(ctx: HttpContext): boolean {
  const method = ctx.request.method?.() ?? 'GET';
  return SAFE_METHODS.has(String(method).toUpperCase());
}

export function requestUsesSessionCookie(
  ctx: HttpContext,
  cookieName = ACCESS_TOKEN_SESSION_COOKIE,
): boolean {
  const authorization = ctx.request.header('authorization');
  const accessToken = ctx.request.header('x-access-token');
  if (authorization || accessToken) {
    return false;
  }

  return typeof ctx.request.cookie(cookieName) === 'string';
}

export function isTrustedBrowserOrigin(ctx: HttpContext): boolean {
  const trustedOrigins = getTrustedBrowserOrigins();
  const originHeader = ctx.request.header('origin');
  const refererHeader = ctx.request.header('referer');
  const browserOrigin = originHeader
    ? normalizeOrigin(originHeader)
    : refererHeader
      ? normalizeOrigin(refererHeader)
      : null;

  if (!browserOrigin) {
    return true;
  }

  return trustedOrigins.has(browserOrigin);
}

export function rejectUntrustedBrowserOrigin(ctx: HttpContext): unknown | null {
  if (isTrustedBrowserOrigin(ctx)) {
    return null;
  }

  return ctx.response.forbidden({
    error: 'CSRF_ORIGIN_FORBIDDEN',
    message: '请求来源不受信任，请从受信任的应用入口重试',
  });
}
