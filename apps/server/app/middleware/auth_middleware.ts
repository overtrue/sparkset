import { HttpContext } from '@adonisjs/core/http';
import { NextFn } from '@adonisjs/core/types/http';
import { AuthManager } from '#services/auth_manager';

/**
 * Auth middleware as a class for AdonisJS container resolution
 */
export default class AuthMiddleware {
  private authManager: AuthManager;

  constructor() {
    this.authManager = new AuthManager();
  }

  async handle(ctx: HttpContext, next: NextFn) {
    try {
      const user = await this.authManager.authenticate(ctx);

      if (!user) {
        const isAjax =
          ctx.request.header('X-Requested-With') === 'XMLHttpRequest' ||
          ctx.request.header('Accept')?.includes('application/json');

        if (isAjax || ctx.request.is(['json'])) {
          return ctx.response.unauthorized({
            error: 'Authentication required',
            message: '请先登录或提供有效的认证信息',
          });
        }

        // For non-API requests, return 401 with clear error
        // The frontend should handle redirecting to login page
        return ctx.response.unauthorized({
          error: 'Authentication required',
          message: '请先登录或提供有效的认证信息',
        });
      }

      if (!user.isActive) {
        return ctx.response.forbidden({
          error: 'User account disabled',
          message: '您的账户已被禁用',
        });
      }

      // Bind user to context
      (ctx as unknown as { auth: { user: typeof user } }).auth = { user };

      return next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return ctx.response.internalServerError({
        error: 'Authentication error',
        message: 'An error occurred during authentication',
      });
    }
  }
}

/**
 * Named middleware export for AdonisJS
 * Note: Currently not used due to container resolution issues
 * Using inline middleware in routes.ts instead
 */
export const authMiddlewareFn = () => AuthMiddleware;
