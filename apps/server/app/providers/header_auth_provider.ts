import { HttpContext } from '@adonisjs/core/http';
import User from '#models/user';
import { AuthProvider, HeaderAuthConfig } from '#types/auth';

/**
 * Header Authentication Provider
 *
 * 适用于内网部署，通过反向代理（Nginx/Apache/Envoy）注入用户信息
 *
 * 配置示例：
 * auth:
 *   header:
 *     enabled: true
 *     trusted_proxies: ['127.0.0.1', '10.0.0.0/8']
 *     header_prefix: 'X-User-'
 *     required_headers: ['Id']
 *
 * 请求头示例：
 * X-User-Id: 123
 * X-User-Name: zhangsan
 * X-User-Email: zhangsan@example.com
 * X-User-Roles: admin,analyst
 */
export class HeaderAuthProvider implements AuthProvider {
  name = 'header';

  enabled(): boolean {
    // 从环境变量或配置读取
    const enabled = process.env.AUTH_HEADER_ENABLED === 'true';
    return enabled;
  }

  canHandle(ctx: HttpContext): boolean {
    if (!this.enabled()) return false;

    // 检查是否来自信任的代理
    if (!this.isTrustedProxy(ctx.request.ip())) return false;

    // 检查必需的 header 是否存在
    const requiredHeaders = this.getConfig().requiredHeaders;
    for (const header of requiredHeaders) {
      if (!ctx.request.header(`${this.getHeaderPrefix()}${header}`)) {
        return false;
      }
    }

    return true;
  }

  async authenticate(ctx: HttpContext): Promise<User | null> {
    if (!this.canHandle(ctx)) return null;

    try {
      const uid = ctx.request.header(`${this.getHeaderPrefix()}Id`);
      if (!uid) return null;

      // 构建用户数据
      const userData = {
        uid: `${this.name}:${uid}`,
        provider: this.name as 'header',
        username: ctx.request.header(`${this.getHeaderPrefix()}Name`) || uid,
        email: ctx.request.header(`${this.getHeaderPrefix()}Email`) || null,
        displayName: ctx.request.header(`${this.getHeaderPrefix()}DisplayName`) || null,
        roles: this.parseRoles(ctx.request.header(`${this.getHeaderPrefix()}Roles`)),
        permissions: this.parsePermissions(
          ctx.request.header(`${this.getHeaderPrefix()}Permissions`),
        ),
      };

      // 查找或创建用户
      const user = await User.firstOrCreate({ uid: userData.uid }, userData);

      // 更新用户信息（如果发生变化）
      if (
        user.username !== userData.username ||
        user.email !== userData.email ||
        JSON.stringify(user.roles) !== JSON.stringify(userData.roles) ||
        JSON.stringify(user.permissions) !== JSON.stringify(userData.permissions)
      ) {
        user.merge(userData);
        await user.save();
      }

      return user;
    } catch (error) {
      console.error('Header Auth error:', error);
      return null;
    }
  }

  /**
   * 检查 IP 是否在信任代理列表中
   */
  private isTrustedProxy(ip: string): boolean {
    const trustedProxies = this.getConfig().trustedProxies;

    // 简单的精确匹配和 CIDR 支持
    for (const proxy of trustedProxies) {
      if (proxy.includes('/')) {
        // CIDR notation
        if (this.isIpInCidr(ip, proxy)) return true;
      } else if (proxy === ip) {
        return true;
      }
    }

    return false;
  }

  /**
   * 简单的 CIDR 检查（仅支持 /8, /16, /24）
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    const bitNum = parseInt(bits, 10);

    if (bitNum === 8) return ipParts[0] === rangeParts[0];
    if (bitNum === 16) return ipParts[0] === rangeParts[0] && ipParts[1] === rangeParts[1];
    if (bitNum === 24)
      return (
        ipParts[0] === rangeParts[0] && ipParts[1] === rangeParts[1] && ipParts[2] === rangeParts[2]
      );

    return false;
  }

  /**
   * 解析角色（逗号分隔）
   */
  private parseRoles(header: string | null): string[] {
    if (!header) return [];
    return header
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
  }

  /**
   * 解析权限（逗号分隔）
   */
  private parsePermissions(header: string | null): string[] {
    if (!header) return [];
    return header
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s);
  }

  /**
   * 获取配置
   */
  private getConfig(): HeaderAuthConfig {
    // 从环境变量读取配置
    const enabled = process.env.AUTH_HEADER_ENABLED === 'true';
    const trustedProxies = process.env.AUTH_HEADER_TRUSTED_PROXIES
      ? process.env.AUTH_HEADER_TRUSTED_PROXIES.split(',')
      : ['127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
    const headerPrefix = process.env.AUTH_HEADER_PREFIX || 'X-User-';
    const requiredHeaders = process.env.AUTH_HEADER_REQUIRED
      ? process.env.AUTH_HEADER_REQUIRED.split(',')
      : ['Id'];

    return {
      enabled,
      trustedProxies,
      headerPrefix,
      requiredHeaders,
    };
  }

  /**
   * 获取 Header 前缀
   */
  private getHeaderPrefix(): string {
    return this.getConfig().headerPrefix;
  }
}
