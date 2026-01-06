import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'bot_integrations';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 多对多关系
      table.integer('bot_id').unsigned().notNullable();
      table.integer('action_id').unsigned().notNullable();

      // 是否必需 (执行时必须调用)
      table.boolean('is_required').notNullable().defaultTo(false);

      // 描述
      table.text('description').nullable();

      // 统计信息
      table.integer('call_count').unsigned().notNullable().defaultTo(0);
      table.timestamp('last_called_at', { useTz: false }).nullable();

      // 时间戳
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 唯一约束 (同一 Bot 不能重复关联同一 Action)
      table.unique(['bot_id', 'action_id'], 'bot_integrations_unique_idx');

      // 索引
      table.index('bot_id', 'bot_integrations_bot_id_idx');
      table.index('action_id', 'bot_integrations_action_id_idx');

      // 外键约束
      table.foreign('bot_id').references('id').inTable('bots').onDelete('CASCADE');
      table.foreign('action_id').references('id').inTable('actions').onDelete('CASCADE');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
