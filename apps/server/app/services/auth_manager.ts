import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';
import type { AuthConfig, AuthProvider, AuthProviderRegistration } from '#types/auth';
import { HeaderAuthProvider } from '#providers/header_auth_provider';
import { LocalAuthProvider } from '#providers/local_auth_provider';
import { getAuthConfig, isOIDCAuthConfigured } from '../../config/auth.js';

type AuthProviderFactoryRegistration = AuthProviderRegistration & {
  createProvider?: () => AuthProvider;
};

export interface AuthManagerOptions {
  config?: AuthConfig;
  providers?: AuthProvider[];
}

export function buildAuthProviderRegistry(
  config: AuthConfig = getAuthConfig(),
): AuthProviderFactoryRegistration[] {
  return [
    {
      name: 'header',
      enabled: config.header.enabled,
      implemented: true,
      priority: 10,
      createProvider: () => new HeaderAuthProvider(config.header),
    },
    {
      name: 'local',
      enabled: config.local.enabled,
      implemented: true,
      priority: 20,
      createProvider: () => new LocalAuthProvider(config.local),
    },
    {
      name: 'oidc',
      enabled: isOIDCAuthConfigured(config.oidc),
      implemented: true,
      priority: 30,
    },
  ];
}

/**
 * AuthManager - 认证调度器
 *
 * 责任链模式：按顺序遍历所有启用的 Provider，
 * 第一个成功认证的 Provider 即为结果
 */
export class AuthManager {
  private providers: AuthProvider[] = [];
  private registry: AuthProviderRegistration[] = [];

  constructor(options: AuthManagerOptions = {}) {
    if (options.providers) {
      this.providers = [...options.providers];
      return;
    }

    this.registerProviders(options.config ?? getAuthConfig());
  }

  /**
   * 注册所有认证提供者
   */
  private registerProviders(config: AuthConfig): void {
    const registry = buildAuthProviderRegistry(config);
    this.registry = registry.map((entry) => ({
      name: entry.name,
      enabled: entry.enabled,
      implemented: entry.implemented,
      priority: entry.priority,
    }));
    this.providers = registry.flatMap((entry) => {
      if (!entry.implemented || !entry.createProvider) return [];
      return [entry.createProvider()];
    });
  }

  /**
   * 执行认证流程
   *
   * @param ctx HTTP 上下文
   * @returns 认证成功的用户，或 null
   */
  async authenticate(ctx: HttpContext): Promise<User | null> {
    for (const provider of this.providers) {
      // 跳过未启用的提供者
      if (!provider.enabled()) continue;

      // 跳过无法处理当前请求的提供者
      if (!provider.canHandle(ctx)) continue;

      try {
        // 尝试认证
        const user = await provider.authenticate(ctx);
        if (user) {
          console.log(`Auth success via ${provider.name}: ${user.username}`);
          return user;
        }
      } catch (error) {
        console.error(`Auth error from ${provider.name}:`, error);
        // 继续尝试下一个提供者
        continue;
      }
    }

    // 所有提供者都失败
    console.log('All auth providers failed');
    return null;
  }

  /**
   * 获取所有已注册的提供者
   */
  getProviders(): AuthProvider[] {
    return [...this.providers];
  }

  /**
   * 获取 provider 注册表，包含尚未实现但已定义的标准接入边界
   */
  getProviderRegistry(): AuthProviderRegistration[] {
    return [...this.registry];
  }

  /**
   * 手动添加提供者（用于测试或扩展）
   */
  addProvider(provider: AuthProvider): void {
    this.providers.push(provider);
  }
}
