import { HttpContext } from '@adonisjs/core/http';
import { NextFn } from '@adonisjs/core/types/http';
import { AccessTokenGuard } from '#guards/access_token_guard';

/**
 * API 认证中间件
 *
 * 使用 Access Token Guard 进行 API 认证
 * 从请求头中读取 Bearer Token 并验证
 */
export default class ApiAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      // 创建 Access Token Guard
      const guard = new AccessTokenGuard(ctx);

      // 尝试认证
      const user = await guard.authenticate();

      if (!user) {
        return ctx.response.unauthorized({
          error: 'Authentication required',
          message: '请提供有效的访问令牌',
        });
      }

      if (!user.isActive) {
        return ctx.response.forbidden({
          error: 'User account disabled',
          message: '您的账户已被禁用',
        });
      }

      // 将用户和 guard 绑定到上下文
      (ctx as unknown as { auth: { user: typeof user; guard: typeof guard } }).auth = {
        user,
        guard,
      };

      return next();
    } catch (error) {
      console.error('API Auth middleware error:', error);
      return ctx.response.unauthorized({
        error: 'Invalid token',
        message: '访问令牌无效或已过期',
      });
    }
  }
}

/**
 * 快速认证函数（用于路由中直接使用）
 */
export async function apiAuthMiddleware(ctx: HttpContext, next: NextFn) {
  const middleware = new ApiAuthMiddleware();
  return middleware.handle(ctx, next);
}
