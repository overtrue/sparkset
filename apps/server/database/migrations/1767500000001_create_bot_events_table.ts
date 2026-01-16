import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'bot_events';

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

      // 外部系统事件标识 (用于去重和关联)
      table.string('external_event_id', 191).notNullable();
      table.index(['bot_id', 'external_event_id'], 'bot_events_unique_idx');

      // 消息内容
      table.text('content').notNullable();

      // 外部用户信息
      table.string('external_user_id', 191).notNullable();
      table.string('external_user_name', 191).nullable();

      // 内部用户 (可选, 用于用户匹配)
      table.integer('internal_user_id').unsigned().nullable();

      // 消息处理状态: pending, processing, completed, failed
      table
        .enum('status', ['pending', 'processing', 'completed', 'failed'])
        .notNullable()
        .defaultTo('pending');

      // 执行结果
      table.json('action_result').nullable(); // 存储 Action 或查询结果

      // 错误信息
      table.text('error_message').nullable();

      // 处理耗时 (毫秒)
      table.integer('processing_time_ms').unsigned().nullable();

      // 重试机制
      table.integer('retry_count').unsigned().notNullable().defaultTo(0);
      table.integer('max_retries').unsigned().notNullable().defaultTo(3);
      table.timestamp('next_retry_at', { useTz: false }).nullable();

      // 对话关联
      table.integer('conversation_id').unsigned().nullable();
      table.json('conversation_message_ids').nullable(); // [[user_msg_id, assistant_msg_id], ...]

      // 时间戳
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index('bot_id', 'bot_events_bot_id_idx');
      table.index('external_user_id', 'bot_events_external_user_id_idx');
      table.index('internal_user_id', 'bot_events_internal_user_id_idx');
      table.index('status', 'bot_events_status_idx');
      table.index('conversation_id', 'bot_events_conversation_id_idx');
      table.index('created_at', 'bot_events_created_at_idx');
      table.index('next_retry_at', 'bot_events_next_retry_at_idx');

      // 外键约束
      table.foreign('bot_id').references('id').inTable('bots').onDelete('CASCADE');
      table.foreign('internal_user_id').references('id').inTable('users').onDelete('SET NULL');
      table
        .foreign('conversation_id')
        .references('id')
        .inTable('conversations')
        .onDelete('SET NULL');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
