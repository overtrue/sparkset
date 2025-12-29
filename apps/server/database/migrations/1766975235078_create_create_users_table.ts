import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 外部系统唯一标识: provider:external_id
      table.string('uid', 191).notNullable().unique();

      // 认证提供方
      table.enum('provider', ['header', 'oidc', 'local', 'system']).notNullable();

      // 用户信息
      table.string('username', 191).notNullable();
      table.string('email', 191).nullable();
      table.string('display_name', 191).nullable();

      // 权限（JSON存储）- MySQL JSON 字段不能有默认值
      table.json('roles');
      table.json('permissions');

      // 软删除标记
      table.boolean('is_active').notNullable().defaultTo(true);

      // 时间戳
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });

      // 索引
      table.index(['uid'], 'users_uid_idx');
      table.index(['provider'], 'users_provider_idx');
      table.index(['is_active'], 'users_is_active_idx');
    });

    // 插入系统匿名用户（用于数据迁移）
    this.defer(async (trx) => {
      const hasSystemUser = await trx.from('users').where('uid', 'system:anonymous').first();
      if (!hasSystemUser) {
        await trx.table('users').insert({
          uid: 'system:anonymous',
          provider: 'system',
          username: 'Anonymous User',
          email: null,
          display_name: 'System Anonymous',
          roles: JSON.stringify([]),
          permissions: JSON.stringify([]),
          is_active: true,
        });
      }
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
