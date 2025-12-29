import { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import User from '#models/user'
import { AuthProvider } from '#types/auth'
import { HeaderAuthProvider } from '#providers/header_auth_provider'

/**
 * AuthManager - 认证调度器
 *
 * 责任链模式：按顺序遍历所有启用的 Provider，
 * 第一个成功认证的 Provider 即为结果
 */
@inject()
export class AuthManager {
  private providers: AuthProvider[] = []

  constructor() {
    this.registerProviders()
  }

  /**
   * 注册所有认证提供者
   */
  private registerProviders(): void {
    // Header Provider（内网推荐）
    this.providers.push(new HeaderAuthProvider())

    // TODO: OIDC Provider（企业部署）
    // if (config.oidc.enabled) {
    //   this.providers.push(new OIDCAuthProvider())
    // }

    // TODO: Local Provider（开发/演示）
    // if (config.local.enabled) {
    //   this.providers.push(new LocalAuthProvider())
    // }
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
      if (!provider.enabled()) continue

      // 跳过无法处理当前请求的提供者
      if (!provider.canHandle(ctx)) continue

      try {
        // 尝试认证
        const user = await provider.authenticate(ctx)
        if (user) {
          console.log(`✅ Auth success via ${provider.name}: ${user.username}`)
          return user
        }
      } catch (error) {
        console.error(`Auth error from ${provider.name}:`, error)
        // 继续尝试下一个提供者
        continue
      }
    }

    // 所有提供者都失败
    console.log('❌ All auth providers failed')
    return null
  }

  /**
   * 获取所有已注册的提供者
   */
  getProviders(): AuthProvider[] {
    return this.providers
  }

  /**
   * 手动添加提供者（用于测试或扩展）
   */
  addProvider(provider: AuthProvider): void {
    this.providers.push(provider)
  }
}
