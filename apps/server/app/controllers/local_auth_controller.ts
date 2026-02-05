import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';
import { LocalAuthProvider } from '#providers/local_auth_provider';
import { AccessTokenGuard } from '#guards/access_token_guard';

/**
 * Local Auth Controller
 *
 * 处理本地认证相关的 HTTP 请求
 * 使用 Access Token Guard 生成和管理令牌
 */
export default class LocalAuthController {
  private authProvider: LocalAuthProvider;

  constructor() {
    this.authProvider = new LocalAuthProvider();
  }

  /**
   * 检查认证状态
   * 支持从 Authorization header 或 localStorage token 验证
   */
  async status(ctx: HttpContext) {
    const { request } = ctx;
    // 尝试从 Authorization header 获取 token
    const authHeader = request.header('authorization');
    let token: string | null = null;

    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      return {
        authenticated: false,
        enabled: this.authProvider.enabled(),
        message: '未认证',
      };
    }

    // 使用 Access Token Guard 验证 token
    const guard = new AccessTokenGuard(ctx);
    try {
      const user = await guard.authenticate();

      if (user && user.isActive) {
        return {
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            roles: user.roles,
            permissions: user.permissions,
            provider: user.provider,
          },
        };
      }
    } catch (error) {
      ctx.logger.debug({ error }, 'Token verification failed');
    }

    return {
      authenticated: false,
      enabled: this.authProvider.enabled(),
      message: '令牌无效',
    };
  }

  /**
   * 登录 - 生成 Access Token
   */
  async login(ctx: HttpContext) {
    const { request, response } = ctx;
    try {
      const { username, password } = request.body();

      if (!username || !password) {
        return response.badRequest({
          error: 'VALIDATION_ERROR',
          message: '用户名和密码不能为空',
        });
      }

      // 查找用户
      const user = await User.query()
        .where('provider', 'local')
        .where('username', username)
        .first();

      if (!user || !user.passwordHash) {
        return response.unauthorized({
          error: 'AUTH_FAILED',
          message: '用户名或密码错误',
        });
      }

      // 验证密码
      const bcrypt = await import('bcrypt');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return response.unauthorized({
          error: 'AUTH_FAILED',
          message: '用户名或密码错误',
        });
      }

      // 检查用户状态
      if (!user.isActive) {
        return response.forbidden({
          error: 'ACCOUNT_DISABLED',
          message: '账户已被禁用',
        });
      }

      // 使用 Access Token Guard 生成令牌
      const guard = new AccessTokenGuard(ctx);
      const { token } = await guard.generateToken(user, `login_${Date.now()}`);

      ctx.logger.info({ username: user.username }, 'Local login success');

      // 返回令牌给客户端（客户端存储在 localStorage）
      return {
        authenticated: true,
        token, // 重要：返回给客户端存储在 localStorage
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          permissions: user.permissions,
          provider: user.provider,
        },
      };
    } catch (error) {
      ctx.logger.error({ error }, 'Login error');
      return response.internalServerError({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '登录失败',
      });
    }
  }

  /**
   * 注册 - 创建用户并生成 Access Token
   */
  async register(ctx: HttpContext) {
    const { request, response } = ctx;
    try {
      const { username, password, email, displayName } = request.body();

      // 验证输入
      if (!username || !password) {
        return response.badRequest({
          error: 'VALIDATION_ERROR',
          message: '用户名和密码不能为空',
        });
      }

      if (username.length < 3) {
        return response.badRequest({
          error: 'VALIDATION_ERROR',
          message: '用户名至少需要3个字符',
        });
      }

      if (password.length < 6) {
        return response.badRequest({
          error: 'VALIDATION_ERROR',
          message: '密码至少需要6个字符',
        });
      }

      // 检查用户名是否已存在
      const existingUser = await User.query()
        .where('provider', 'local')
        .where('username', username)
        .first();

      if (existingUser) {
        return response.conflict({
          error: 'USERNAME_EXISTS',
          message: '用户名已存在',
        });
      }

      // 哈希密码
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);

      // 获取配置
      const config = this.authProvider['getConfig']();

      // 创建用户
      const user = await User.create({
        uid: `local:${username}`,
        provider: 'local',
        username,
        email: email || null,
        displayName: displayName || username,
        passwordHash,
        roles: config.defaultRoles,
        permissions: config.defaultPermissions,
        isActive: true,
      });

      ctx.logger.info({ username: user.username }, 'Local registration success');

      // 使用 Access Token Guard 生成令牌
      const guard = new AccessTokenGuard(ctx);
      const { token } = await guard.generateToken(user, `register_${Date.now()}`);

      return {
        authenticated: true,
        token, // 重要：返回给客户端存储在 localStorage
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          permissions: user.permissions,
          provider: user.provider,
        },
      };
    } catch (error) {
      ctx.logger.error({ error }, 'Registration error');
      return response.internalServerError({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : '注册失败',
      });
    }
  }

  /**
   * 登出 - 撤销 Access Token
   */
  async logout(ctx: HttpContext) {
    const { request, response } = ctx;
    try {
      // 从 Authorization header 获取 token
      const authHeader = request.header('authorization');
      let token: string | null = null;

      if (authHeader && typeof authHeader === 'string') {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        if (match) {
          token = match[1];
        }
      }

      if (token) {
        // 撤销令牌
        const guard = new AccessTokenGuard(ctx);
        await guard.revokeToken(token);
      }

      return {
        success: true,
        message: '已成功登出',
      };
    } catch (error) {
      ctx.logger.error({ error }, 'Logout error');
      return response.internalServerError({
        error: 'INTERNAL_ERROR',
        message: '登出失败',
      });
    }
  }

  /**
   * 刷新令牌 - 生成新的 Access Token
   */
  async refresh(ctx: HttpContext) {
    const { request, response } = ctx;
    try {
      // 从 Authorization header 获取旧 token
      const authHeader = request.header('authorization');
      let oldToken: string | null = null;

      if (authHeader && typeof authHeader === 'string') {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        if (match) {
          oldToken = match[1];
        }
      }

      if (!oldToken) {
        return response.unauthorized({
          error: 'NO_TOKEN',
          message: '缺少访问令牌',
        });
      }

      // 验证旧令牌并获取用户
      const guard = new AccessTokenGuard(ctx);
      const user = await guard.authenticate();

      // 撤销旧令牌
      await guard.revokeToken(oldToken);

      // 生成新令牌
      const { token } = await guard.generateToken(user, `refresh_${Date.now()}`);

      return {
        success: true,
        token, // 新令牌
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          roles: user.roles,
          permissions: user.permissions,
          provider: user.provider,
        },
      };
    } catch (error) {
      ctx.logger.error({ error }, 'Refresh token error');
      return response.unauthorized({
        error: 'INVALID_TOKEN',
        message: '令牌无效，需要重新登录',
      });
    }
  }
}
