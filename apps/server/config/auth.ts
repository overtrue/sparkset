/**
 * 认证配置文件
 */

import type { AuthConfig, HeaderAuthConfig, LocalAuthConfig, OIDCAuthConfig } from '#types/auth';

function splitEnvList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getHeaderAuthConfig(): HeaderAuthConfig {
  return {
    enabled: process.env.AUTH_HEADER_ENABLED === 'true',
    trustedProxies: splitEnvList(process.env.AUTH_HEADER_TRUSTED_PROXIES, [
      '127.0.0.1',
      '10.0.0.0/8',
      '172.16.0.0/12',
      '192.168.0.0/16',
    ]),
    headerPrefix: process.env.AUTH_HEADER_PREFIX || 'X-User-',
    requiredHeaders: splitEnvList(process.env.AUTH_HEADER_REQUIRED, ['Id']),
  };
}

export function getLocalAuthConfig(): LocalAuthConfig {
  const enabled =
    process.env.AUTH_LOCAL_ENABLED === 'true' || process.env.NODE_ENV === 'development';

  return {
    enabled,
    allowRegistration: process.env.AUTH_LOCAL_ALLOW_REGISTRATION !== 'false',
    defaultRoles: splitEnvList(process.env.AUTH_LOCAL_DEFAULT_ROLES, ['viewer']),
    defaultPermissions: splitEnvList(process.env.AUTH_LOCAL_DEFAULT_PERMISSIONS, [
      'read:action',
      'read:conversation',
    ]),
    devUsers: [
      {
        username: 'admin',
        password: 'admin123',
        roles: ['admin'],
        permissions: ['*'],
      },
      {
        username: 'analyst',
        password: 'analyst123',
        roles: ['analyst'],
        permissions: ['query:read'],
      },
    ],
  };
}

export function getOIDCAuthConfig(): OIDCAuthConfig {
  return {
    enabled: process.env.AUTH_OIDC_ENABLED === 'true',
    issuer: process.env.AUTH_OIDC_ISSUER,
    authorizationUrl: process.env.AUTH_OIDC_AUTHORIZATION_URL,
    tokenUrl: process.env.AUTH_OIDC_TOKEN_URL,
    jwksUrl: process.env.AUTH_OIDC_JWKS_URL,
    clientId: process.env.AUTH_OIDC_CLIENT_ID,
    clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
    redirectUri: process.env.AUTH_OIDC_REDIRECT_URI,
    successRedirectUrl:
      process.env.AUTH_OIDC_SUCCESS_REDIRECT_URL ||
      process.env.DASHBOARD_URL ||
      process.env.FRONTEND_URL,
    failureRedirectUrl:
      process.env.AUTH_OIDC_FAILURE_REDIRECT_URL ||
      (process.env.DASHBOARD_URL
        ? `${process.env.DASHBOARD_URL.replace(/\/$/, '')}/login?error=oidc`
        : undefined) ||
      (process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/login?error=oidc`
        : undefined),
    scopes: splitEnvList(process.env.AUTH_OIDC_SCOPES, ['openid', 'profile', 'email']),
    defaultRoles: splitEnvList(process.env.AUTH_OIDC_DEFAULT_ROLES, []),
    defaultPermissions: splitEnvList(process.env.AUTH_OIDC_DEFAULT_PERMISSIONS, []),
    claimMapping: {
      uid: 'sub',
      username: 'preferred_username',
      email: 'email',
      roles: 'roles',
      permissions: 'permissions',
    },
  };
}

export function isOIDCAuthConfigured(config: OIDCAuthConfig = getOIDCAuthConfig()): boolean {
  return Boolean(
    config.enabled &&
    config.issuer &&
    config.authorizationUrl &&
    config.tokenUrl &&
    config.jwksUrl &&
    config.clientId &&
    config.clientSecret &&
    config.redirectUri,
  );
}

export function getAuthConfig(): AuthConfig {
  return {
    header: getHeaderAuthConfig(),
    local: getLocalAuthConfig(),
    oidc: getOIDCAuthConfig(),
  };
}

export default getAuthConfig();
