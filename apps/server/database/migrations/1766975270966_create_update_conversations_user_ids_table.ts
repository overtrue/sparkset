import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'conversations';

  async up() {
    // 1. 更新现有 conversations 的 user_id
    this.defer(async (trx) => {
      const systemUser = await trx.from('users').where('uid', 'system:anonymous').first();
      if (systemUser) {
        // 将所有 NULL user_id 更新为系统用户
        const result = await trx
          .table('conversations')
          .whereNull('user_id')
          .update({ user_id: systemUser.id });
        console.log(`✅ Updated ${result} conversations to system user`);
      }
    });

    // 2. 添加外键约束
    this.schema.table(this.tableName, (table) => {
      // 先删除可能存在的旧约束（如果存在）
      table.dropForeign(['user_id']).catch(() => {
        // Ignore error if constraint doesn't exist
      });

      // 重新设置为非空并添加外键
      table.integer('user_id').unsigned().notNullable().alter();
      table.foreign('user_id').references('users.id').onDelete('CASCADE');
    });
  }

  async down() {
    // 回滚：移除外键约束，允许 NULL
    this.schema.table(this.tableName, (table) => {
      table.dropForeign(['user_id']);
      table.integer('user_id').unsigned().nullable().alter();
    });
  }
}
