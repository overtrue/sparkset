import type { HttpContext } from '@adonisjs/core/http';
import { ACCESS_TOKEN_SESSION_COOKIE } from '#guards/access_token_guard';
import { isTrustedOrigin, normalizeOrigin } from './browser_origins.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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
  const originHeader = ctx.request.header('origin');
  const refererHeader = ctx.request.header('referer');
  const browserOrigin = originHeader
    ? normalizeOrigin(originHeader)
    : refererHeader
      ? normalizeOrigin(refererHeader)
      : null;

  if (!browserOrigin) {
    return false;
  }

  return isTrustedOrigin(browserOrigin);
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
