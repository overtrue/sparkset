import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    // Check if column already exists to avoid errors
    const hasColumn = await this.schema.hasColumn(this.tableName, 'password_hash');

    if (!hasColumn) {
      // 添加密码字段（仅用于 local provider）
      this.schema.alterTable(this.tableName, (table) => {
        table.string('password_hash', 255).nullable();
        table.index(['password_hash'], 'users_password_hash_idx');
      });
    }

    // 插入默认本地测试用户
    this.defer(async (trx) => {
      const hasLocalUser = await trx.from('users').where('uid', 'local:admin').first();
      if (!hasLocalUser) {
        // 密码: admin123 (使用 bcrypt 哈希)
        await trx.table('users').insert({
          uid: 'local:admin',
          provider: 'local',
          username: 'admin',
          email: 'admin@example.com',
          display_name: 'Admin User',
          password_hash: '$2b$10$K8wjZ1cJ3zQYQ5v6X7Y8QeX9zQYQ5v6X7Y8QeX9zQYQ5v6X7Y8QeX9', // placeholder
          roles: JSON.stringify(['admin']),
          permissions: JSON.stringify(['read:*', 'write:*', 'delete:*']),
          is_active: true,
        });
      }
    });
  }

  async down() {
    // Check if column exists before dropping
    const hasColumn = await this.schema.hasColumn(this.tableName, 'password_hash');

    if (hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('password_hash');
      });
    }
  }
}
