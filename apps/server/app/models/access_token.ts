import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import User from './user.js';

/**
 * Access Token 模型
 *
 * 用于 API 认证的访问令牌
 * 令牌存储在数据库中，客户端存储在 localStorage
 */
export default class AccessToken extends BaseModel {
  static table = 'access_tokens';

  @column({ isPrimary: true })
  declare id: number;

  /**
   * 关联的用户 ID
   */
  @column()
  declare userId: number;

  /**
   * 令牌标识符（用于区分不同设备/会话）
   */
  @column()
  declare identifier: string;

  /**
   * 令牌哈希值（存储哈希后的令牌，不存明文）
   */
  @column()
  declare tokenHash: string;

  /**
   * 令牌明文（仅在创建时返回给客户端，之后无法访问）
   * 这个字段不会持久化到数据库
   */
  declare token?: string;

  /**
   * 令牌过期时间
   * null 表示永不过期
   */
  @column.dateTime()
  declare expiresAt: DateTime | null;

  /**
   * 最后使用时间
   */
  @column.dateTime({ autoCreate: false, autoUpdate: false })
  declare lastUsedAt: DateTime | null;

  /**
   * 是否仅用于测试（临时令牌）
   */
  @column()
  declare isTest: boolean;

  /**
   * 用户代理信息
   */
  @column()
  declare userAgent: string | null;

  /**
   * IP 地址
   */
  @column()
  declare ipAddress: string | null;

  /**
   * 创建时间
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  /**
   * 更新时间
   */
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  /**
   * 关联的用户
   */
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>;

  /**
   * 检查令牌是否过期
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return this.expiresAt.diffNow().as('milliseconds') <= 0;
  }

  /**
   * 检查令牌是否有效
   */
  isValid(): boolean {
    return !this.isExpired();
  }
}
