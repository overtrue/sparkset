import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Conversation from './conversation.js';
import AccessToken from './access_token.js';

export default class User extends BaseModel {
  static table = 'users';

  @column({ isPrimary: true })
  declare id: number;

  /**
   * 外部系统唯一标识
   * 格式: provider:external_id
   * 例如: header:123, oidc:abc-xyz, local:admin
   */
  @column()
  declare uid: string;

  /**
   * 认证提供方
   * - header: 内网网关认证
   * - oidc: OIDC/SSO 认证
   * - local: 本地开发/演示
   * - system: 系统内部用户
   */
  @column()
  declare provider: 'header' | 'oidc' | 'local' | 'system';

  @column()
  declare username: string;

  @column()
  declare email: string | null;

  @column()
  declare displayName: string | null;

  /**
   * 密码哈希（仅用于 local provider）
   * 使用 bcrypt 哈希存储
   */
  @column()
  declare passwordHash: string | null;

  /**
   * 用户角色数组
   * 例如: ["admin", "analyst", "viewer"]
   */
  @column({
    prepare: (value: unknown) => JSON.stringify(value),
    consume: (value: string | unknown) => {
      if (value === null || value === undefined) return [];
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return [];
    },
  })
  declare roles: string[];

  /**
   * 用户权限数组
   * 例如: ["datasource:read", "query:write", "dashboard:delete"]
   */
  @column({
    prepare: (value: unknown) => JSON.stringify(value),
    consume: (value: string | unknown) => {
      if (value === null || value === undefined) return [];
      if (typeof value === 'object') return value;
      if (typeof value === 'string') return JSON.parse(value);
      return [];
    },
  })
  declare permissions: string[];

  /**
   * 是否激活
   * 软删除标记，禁用用户但保留数据
   */
  @column()
  declare isActive: boolean;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  /**
   * 关联的对话
   */
  @hasMany(() => Conversation)
  declare conversations: HasMany<typeof Conversation>;

  /**
   * 关联的访问令牌
   */
  @hasMany(() => AccessToken)
  declare accessTokens: HasMany<typeof AccessToken>;
}
