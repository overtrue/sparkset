import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'bot_logs';

  async up() {
    // Use createTableIfNotExists for idempotency
    const hasTable = await this.schema.hasTable(this.tableName);
    if (hasTable) {
      return;
    }

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 关联
      table.integer('bot_id').unsigned().notNullable();

      // 操作事件: create, update, delete, enable, disable, regenerate_token, etc.
      table.string('event_id', 64).notNullable();

      // 操作类型: create, update, delete, enable, disable, regenerate_token
      table.string('action', 32).notNullable();

      // 执行者
      table.integer('performed_by').unsigned().nullable();

      // 变更内容 (仅在 update 时使用)
      table.json('changes').nullable(); // { field: { old, new } }

      // 请求元数据
      table.string('ip_address', 45).nullable();
      table.text('user_agent').nullable();

      // 时间戳
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index('bot_id', 'bot_logs_bot_id_idx');
      table.index('event_id', 'bot_logs_event_id_idx');
      table.index('action', 'bot_logs_action_idx');
      table.index('performed_by', 'bot_logs_performed_by_idx');
      table.index('created_at', 'bot_logs_created_at_idx');

      // 外键约束
      table.foreign('bot_id').references('id').inTable('bots').onDelete('CASCADE');
      table.foreign('performed_by').references('id').inTable('users').onDelete('SET NULL');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
