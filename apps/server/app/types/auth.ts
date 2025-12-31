/**
 * 认证系统类型定义
 */

import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';

/**
 * AuthProvider 接口 - 所有认证提供者必须实现
 */
export interface AuthProvider {
  name: string;

  /**
   * 是否启用该提供者
   */
  enabled(): boolean;

  /**
   * 判断该提供者是否可以处理当前请求
   */
  canHandle(ctx: HttpContext): boolean;

  /**
   * 执行认证，返回用户或 null
   */
  authenticate(ctx: HttpContext): Promise<User | null>;
}

/**
 * Header Auth 配置
 */
export interface HeaderAuthConfig {
  enabled: boolean;
  trustedProxies: string[];
  headerPrefix: string;
  requiredHeaders: string[];
}

/**
 * Local Auth 配置
 */
export interface LocalAuthConfig {
  enabled: boolean;
  allowRegistration: boolean;
  defaultRoles: string[];
  defaultPermissions: string[];
  devUsers?: {
    username: string;
    password: string;
    roles: string[];
    permissions: string[];
  }[];
}

/**
 * OIDC Auth 配置
 */
export interface OIDCAuthConfig {
  enabled: boolean;
  issuer?: string;
  clientId?: string;
  clientSecret?: string;
  scopes: string[];
  claimMapping: {
    uid: string;
    username: string;
    email: string;
    roles: string;
    permissions: string;
  };
}

/**
 * 认证配置
 */
export interface AuthConfig {
  header: HeaderAuthConfig;
  local: LocalAuthConfig;
  oidc: OIDCAuthConfig;
}
