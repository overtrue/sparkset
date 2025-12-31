import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';
import { AuthProvider } from '#types/auth';
import { LocalAuthConfig } from '#types/auth';
import bcrypt from 'bcrypt';

/**
 * Local Authentication Provider
 *
 * 适用于开发和演示环境，支持用户名密码登录
 * 也支持用户注册功能
 *
 * 配置示例：
 * auth:
 *   local:
 *     enabled: true
 *     allowRegistration: true
 *     defaultRoles: ['viewer']
 *     defaultPermissions: ['read:datasource']
 *
 * 登录请求：
 * POST /auth/local/login
 * { username: 'admin', password: 'admin123' }
 *
 * 注册请求：
 * POST /auth/local/register
 * { username: 'newuser', password: 'password123', email: 'user@example.com' }
 */
export class LocalAuthProvider implements AuthProvider {
  name = 'local';

  enabled(): boolean {
    return process.env.AUTH_LOCAL_ENABLED === 'true';
  }

  canHandle(ctx: HttpContext): boolean {
    if (!this.enabled()) return false;

    // 检查是否是本地认证相关的请求
    const path = ctx.request.url();
    if (path.startsWith('/auth/local/')) {
      return true;
    }

    // 检查是否有本地认证的 cookie
    const authToken = ctx.request.cookie('auth_token');
    const authProvider = ctx.request.cookie('auth_provider');
    if (authToken && authProvider === 'local') {
      return true;
    }

    return false;
  }

  async authenticate(ctx: HttpContext): Promise<User | null> {
    if (!this.canHandle(ctx)) return null;

    try {
      const path = ctx.request.url();

      // 处理登录请求
      if (path === '/auth/local/login' && ctx.request.method() === 'POST') {
        return await this.handleLogin(ctx);
      }

      // 处理注册请求
      if (path === '/auth/local/register' && ctx.request.method() === 'POST') {
        return await this.handleRegister(ctx);
      }

      // 处理 session 认证
      return await this.handleSessionAuth(ctx);
    } catch (error) {
      console.error('Local Auth error:', error);
      return null;
    }
  }

  /**
   * 处理登录请求
   */
  private async handleLogin(ctx: HttpContext): Promise<User | null> {
    const { username, password } = ctx.request.body();

    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }

    // 查找用户
    const user = await User.query().where('provider', 'local').where('username', username).first();

    if (!user || !user.passwordHash) {
      throw new Error('用户名或密码错误');
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('用户名或密码错误');
    }

    // 检查用户状态
    if (!user.isActive) {
      throw new Error('账户已被禁用');
    }

    // 设置 cookies (替代 session)
    // Note: In production, you'd want to set secure cookies properly
    // For now, we'll rely on the auth_status endpoint to handle this
    console.log(`✅ Local login success: ${user.username}`);
    return user;
  }

  /**
   * 处理注册请求
   */
  private async handleRegister(ctx: HttpContext): Promise<User | null> {
    const config = this.getConfig();

    if (!config.allowRegistration) {
      throw new Error('注册功能已禁用');
    }

    const { username, password, email, displayName } = ctx.request.body();

    // 验证输入
    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }

    if (username.length < 3) {
      throw new Error('用户名至少需要3个字符');
    }

    if (password.length < 6) {
      throw new Error('密码至少需要6个字符');
    }

    // 检查用户名是否已存在
    const existingUser = await User.query()
      .where('provider', 'local')
      .where('username', username)
      .first();

    if (existingUser) {
      throw new Error('用户名已存在');
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, 10);

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

    // 设置 cookies (替代 session)
    // Note: In production, you'd want to set secure cookies properly
    console.log(`✅ Local registration success: ${user.username}`);
    return user;
  }

  /**
   * 处理基于 cookie 的认证
   */
  private async handleSessionAuth(ctx: HttpContext): Promise<User | null> {
    const authToken = ctx.request.cookie('auth_token');
    const authProvider = ctx.request.cookie('auth_provider');

    if (authProvider !== 'local' || !authToken) {
      return null;
    }

    // 解析 token (格式: userId_timestamp)
    const [userId] = authToken.split('_');
    if (!userId) return null;

    const user = await User.find(parseInt(userId));
    if (!user || !user.isActive) {
      return null;
    }

    return user;
  }

  /**
   * 获取配置
   */
  private getConfig(): LocalAuthConfig {
    const enabled = process.env.AUTH_LOCAL_ENABLED === 'true';
    const allowRegistration = process.env.AUTH_LOCAL_ALLOW_REGISTRATION !== 'false';
    const defaultRoles = process.env.AUTH_LOCAL_DEFAULT_ROLES
      ? process.env.AUTH_LOCAL_DEFAULT_ROLES.split(',')
      : ['viewer'];
    const defaultPermissions = process.env.AUTH_LOCAL_DEFAULT_PERMISSIONS
      ? process.env.AUTH_LOCAL_DEFAULT_PERMISSIONS.split(',')
      : ['read:datasource', 'read:action', 'read:conversation'];

    return {
      enabled,
      allowRegistration,
      defaultRoles,
      defaultPermissions,
    };
  }
}
