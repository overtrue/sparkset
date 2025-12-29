/**
 * 认证配置文件
 *
 * 从环境变量读取配置，提供默认值
 */

import { AuthConfig, HeaderAuthConfig, LocalAuthConfig, OIDCAuthConfig } from '#types/auth'

/**
 * 获取 Header Auth 配置
 */
export function getHeaderAuthConfig(): HeaderAuthConfig {
  return {
    enabled: process.env.AUTH_HEADER_ENABLED === 'true',
    trustedProxies: process.env.AUTH_HEADER_TRUSTED_PROXIES
      ? process.env.AUTH_HEADER_TRUSTED_PROXIES.split(',').map(s => s.trim())
      : ['127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
    headerPrefix: process.env.AUTH_HEADER_PREFIX || 'X-User-',
    requiredHeaders: process.env.AUTH_HEADER_REQUIRED
      ? process.env.AUTH_HEADER_REQUIRED.split(',').map(s => s.trim())
      : ['Id'],
  }
}

/**
 * 获取 Local Auth 配置（仅开发/演示）
 */
export function getLocalAuthConfig(): LocalAuthConfig {
  const enabled = process.env.AUTH_LOCAL_ENABLED === 'true' || process.env.NODE_ENV === 'development'

  return {
    enabled,
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
  }
}

/**
 * 获取 OIDC 配置
 */
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
  }
}

/**
 * 获取完整认证配置
 */
export function getAuthConfig(): AuthConfig {
  return {
    header: getHeaderAuthConfig(),
    local: getLocalAuthConfig(),
    oidc: getOIDCAuthConfig(),
  }
}

export default getAuthConfig()
