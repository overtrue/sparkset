import { HttpContext } from '@adonisjs/core/http'
import type { GuardContract } from '@adonisjs/auth/types'
import User from '#models/user'
import AccessToken from '#models/access_token'
import { DateTime } from 'luxon'
import crypto from 'crypto'

/**
 * Access Token Guard 配置
 */
export interface AccessTokenGuardConfig {
  tokenPrefix: string // 令牌前缀，例如 "sat_" (sparkset access token)
  tokenLength: number // 令牌长度
  tokenExpiry: string | null // 默认过期时间，null 表示永不过期
  tokenHashAlgo: 'sha256' // 令牌哈希算法
}

/**
 * Access Token Guard
 *
 * 使用数据库存储的访问令牌进行 API 认证
 * 客户端将令牌存储在 localStorage 中
 */
export class AccessTokenGuard implements GuardContract<User> {
  readonly driverName = 'access_tokens'
  private ctx: HttpContext
  private config: AccessTokenGuardConfig

  private _user?: User
  private _isAuthenticated = false
  private _authenticationAttempted = false

  constructor(ctx: HttpContext, config?: Partial<AccessTokenGuardConfig>) {
    this.ctx = ctx
    this.config = {
      tokenPrefix: config?.tokenPrefix || 'sat_',
      tokenLength: config?.tokenLength || 64,
      tokenExpiry: config?.tokenExpiry || null,
      tokenHashAlgo: config?.tokenHashAlgo || 'sha256',
    }
  }

  /**
   * 获取当前认证的用户
   */
  get user(): User | undefined {
    return this._user
  }

  /**
   * 设置当前用户（用于测试）
   */
  set user(user: User | undefined) {
    this._user = user
    this._isAuthenticated = !!user
  }

  /**
   * 是否已认证
   */
  get isAuthenticated(): boolean {
    return this._isAuthenticated
  }

  /**
   * 认证是否已尝试
   */
  get authenticationAttempted(): boolean {
    return this._authenticationAttempted
  }

  /**
   * 获取当前用户，如果未认证则抛出异常
   */
  getUserOrFail(): User {
    if (!this._user) {
      throw new Error('User not authenticated')
    }
    return this._user
  }

  /**
   * 检查认证状态（不抛出异常）
   */
  async check(): Promise<boolean> {
    if (this._authenticationAttempted) {
      return this._isAuthenticated
    }

    await this.authenticate()
    return this._isAuthenticated
  }

  /**
   * 认证当前请求
   */
  async authenticate(): Promise<User> {
    // 如果已经认证，直接返回用户
    if (this._isAuthenticated && this._user) {
      return this._user
    }

    // 标记认证已尝试
    this._authenticationAttempted = true

    // 从请求头获取令牌
    const token = this.extractTokenFromRequest()
    if (!token) {
      throw new Error('No access token provided')
    }

    // 验证令牌
    const user = await this.verifyToken(token)
    if (!user) {
      throw new Error('Invalid or expired access token')
    }

    // 更新令牌使用时间
    await this.updateTokenUsage(token)

    this._user = user
    this._isAuthenticated = true

    return user
  }

  /**
   * 作为客户端认证（用于测试）
   */
  async authenticateAsClient(user: User): Promise<{ headers: Record<string, string> }> {
    const { token } = await this.generateToken(user)

    // 返回需要设置的头部
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  }

  /**
   * 从请求中提取令牌
   */
  private extractTokenFromRequest(): string | null {
    const authHeader = this.ctx.request.header('authorization')

    if (authHeader && typeof authHeader === 'string') {
      // 支持 Bearer Token 格式
      const match = authHeader.match(/^Bearer\s+(.+)$/i)
      if (match) {
        return match[1]
      }
    }

    // 也支持从自定义头部获取
    const tokenHeader = this.ctx.request.header('x-access-token')
    if (tokenHeader && typeof tokenHeader === 'string') {
      return tokenHeader
    }

    return null
  }

  /**
   * 验证令牌
   */
  private async verifyToken(token: string): Promise<User | null> {
    // 哈希令牌以进行数据库查找
    const tokenHash = this.hashToken(token)

    // 查找令牌
    const accessToken = await AccessToken.query()
      .where('tokenHash', tokenHash)
      .preload('user')
      .first()

    if (!accessToken || !accessToken.user) {
      return null
    }

    // 检查是否过期
    if (accessToken.isExpired()) {
      await accessToken.delete() // 删除过期的令牌
      return null
    }

    // 检查用户状态
    if (!accessToken.user.isActive) {
      return null
    }

    return accessToken.user
  }

  /**
   * 生成新的访问令牌
   */
  async generateToken(user: User, identifier?: string): Promise<{ token: string; accessToken: AccessToken }> {
    // 生成随机令牌
    const token = this.config.tokenPrefix + crypto.randomBytes(this.config.tokenLength).toString('hex')

    // 哈希令牌
    const tokenHash = this.hashToken(token)

    // 计算过期时间
    let expiresAt = null
    if (this.config.tokenExpiry) {
      expiresAt = DateTime.now().plus(this.parseDuration(this.config.tokenExpiry))
    }

    // 创建令牌记录
    const accessToken = await AccessToken.create({
      userId: user.id,
      identifier: identifier || `device_${Date.now()}`,
      tokenHash,
      expiresAt,
      userAgent: this.ctx.request.header('user-agent') || null,
      ipAddress: this.ctx.request.ip() || null,
    })

    // 将明文令牌附加到模型（仅用于返回给客户端）
    ;(accessToken as unknown as { token: string }).token = token

    return { token, accessToken }
  }

  /**
   * 撤销指定令牌
   */
  async revokeToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token)
    await AccessToken.query().where('tokenHash', tokenHash).delete()
  }

  /**
   * 撤销用户的所有令牌
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await AccessToken.query().where('userId', userId).delete()
  }

  /**
   * 更新令牌使用时间
   */
  private async updateTokenUsage(token: string): Promise<void> {
    const tokenHash = this.hashToken(token)
    await AccessToken.query()
      .where('tokenHash', tokenHash)
      .update({ lastUsedAt: DateTime.now().toISO() })
  }

  /**
   * 哈希令牌
   */
  private hashToken(token: string): string {
    return crypto.createHash(this.config.tokenHashAlgo).update(token).digest('hex')
  }

  /**
   * 解析持续时间字符串
   */
  private parseDuration(duration: string): { days?: number; hours?: number; minutes?: number } {
    // 支持格式: "7d", "24h", "30m"
    const match = duration.match(/^(\d+)([dhm])$/)
    if (!match) {
      return { days: 7 } // 默认 7 天
    }

    const value = parseInt(match[1], 10)
    const unit = match[2]

    switch (unit) {
      case 'd':
        return { days: value }
      case 'h':
        return { hours: value }
      case 'm':
        return { minutes: value }
      default:
        return { days: 7 }
    }
  }
}

/**
 * Guard 工厂函数
 */
export function createAccessTokenGuard(ctx: HttpContext): AccessTokenGuard {
  return new AccessTokenGuard(ctx, {
    tokenPrefix: 'sat_',
    tokenLength: 64,
    tokenExpiry: '7d', // 默认 7 天过期
    tokenHashAlgo: 'sha256',
  })
}
