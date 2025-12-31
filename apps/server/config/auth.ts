/**
 * 认证配置文件
 */

import { AuthConfig, HeaderAuthConfig, LocalAuthConfig, OIDCAuthConfig } from '#types/auth';

export function getHeaderAuthConfig(): HeaderAuthConfig {
  return {
    enabled: process.env.AUTH_HEADER_ENABLED === 'true',
    trustedProxies: process.env.AUTH_HEADER_TRUSTED_PROXIES
      ? process.env.AUTH_HEADER_TRUSTED_PROXIES.split(',').map((s) => s.trim())
      : ['127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    headerPrefix: process.env.AUTH_HEADER_PREFIX || 'X-User-',
    requiredHeaders: process.env.AUTH_HEADER_REQUIRED
      ? process.env.AUTH_HEADER_REQUIRED.split(',').map((s) => s.trim())
      : ['Id'],
  };
}

export function getLocalAuthConfig(): LocalAuthConfig {
  const enabled =
    process.env.AUTH_LOCAL_ENABLED === 'true' || process.env.NODE_ENV === 'development';

  return {
    enabled,
    allowRegistration: process.env.AUTH_LOCAL_ALLOW_REGISTRATION !== 'false',
    defaultRoles: process.env.AUTH_LOCAL_DEFAULT_ROLES
      ? process.env.AUTH_LOCAL_DEFAULT_ROLES.split(',')
      : ['viewer'],
    defaultPermissions: process.env.AUTH_LOCAL_DEFAULT_PERMISSIONS
      ? process.env.AUTH_LOCAL_DEFAULT_PERMISSIONS.split(',')
      : ['read:datasource', 'read:action', 'read:conversation'],
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
        permissions: ['query:read', 'datasource:read'],
      },
    ],
  };
}

export function getOIDCAuthConfig(): OIDCAuthConfig {
  return {
    enabled: process.env.AUTH_OIDC_ENABLED === 'true',
    issuer: process.env.AUTH_OIDC_ISSUER,
    clientId: process.env.AUTH_OIDC_CLIENT_ID,
    clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
    scopes: ['openid', 'profile', 'email'],
    claimMapping: {
      uid: 'sub',
      username: 'preferred_username',
      email: 'email',
      roles: 'roles',
      permissions: 'permissions',
    },
  };
}

export function getAuthConfig(): AuthConfig {
  return {
    header: getHeaderAuthConfig(),
    local: getLocalAuthConfig(),
    oidc: getOIDCAuthConfig(),
  };
}

export default getAuthConfig();
