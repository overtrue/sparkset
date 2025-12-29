import { HttpContext } from '@adonisjs/core/http'
import { NextFn } from '@adonisjs/core/types/http'
import { inject } from '@adonisjs/core'
import { AuthManager } from '#services/auth_manager'

/**
 * 认证中间件
 *
 * 保护需要认证的路由，自动执行认证流程
 */
@inject()
export default class AuthMiddleware {
  constructor(private authManager: AuthManager) {}

  async handle(ctx: HttpContext, next: NextFn) {
    // 1. 尝试认证
    const user = await this.authManager.authenticate(ctx)

    if (!user) {
      // 2. 未认证处理
      const isAjax = ctx.request.header('X-Requested-With') === 'XMLHttpRequest' ||
                     ctx.request.header('Accept')?.includes('application/json')

      if (isAjax || ctx.request.is(['json'])) {
        return ctx.response.unauthorized({
          error: 'Authentication required',
          message: '请先登录或提供有效的认证信息',
        })
      }

      // 重定向到登录页（如果有）
      return ctx.response.redirect('/login')
    }

    // 3. 检查用户状态
    if (!user.isActive) {
      return ctx.response.forbidden({
        error: 'User account disabled',
        message: '您的账户已被禁用',
      })
    }

    // 4. 绑定到上下文
    ctx.auth = { user }

    // 5. 继续处理
    return next()
  }
}
