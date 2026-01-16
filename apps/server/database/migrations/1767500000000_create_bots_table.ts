import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'bots';

  async up() {
    // Use createTableIfNotExists for idempotency
    const hasTable = await this.schema.hasTable(this.tableName);
    if (hasTable) {
      return;
    }

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 基础信息
      table.string('name', 191).notNullable();
      table.text('description').nullable();

      // 平台类型: wecom, discord, telegram, slack, etc.
      table.enum('type', ['wecom', 'discord', 'telegram', 'slack', 'custom']).notNullable();

      // Webhook 配置
      table.string('webhook_url', 2048).notNullable();
      table.string('webhook_token', 64).notNullable().unique();

      // 适配器配置 (JSON - 灵活存储平台特定配置)
      table.json('adapter_config').nullable();

      // 启用的功能和数据源 (JSON - 整数数组)
      table.json('enabled_actions').nullable(); // [1, 2, 3]
      table.json('enabled_data_sources').nullable(); // [1, 2]

      // 默认数据源
      table.integer('default_data_source_id').unsigned().nullable();

      // AI 提供商
      table.integer('ai_provider_id').unsigned().nullable();

      // 功能开关
      table.boolean('enable_query').notNullable().defaultTo(true);
      table.boolean('is_active').notNullable().defaultTo(true);
      table.boolean('is_verified').notNullable().defaultTo(false);

      // 限流和超时配置
      table.integer('rate_limit').unsigned().nullable(); // 每分钟请求数
      table.integer('max_retries').unsigned().notNullable().defaultTo(3);
      table.integer('request_timeout').unsigned().notNullable().defaultTo(30000); // 毫秒

      // 审计字段
      table.integer('creator_id').unsigned().nullable();
      table.integer('updater_id').unsigned().nullable();

      // 时间戳
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index('type', 'bots_type_idx');
      table.index('webhook_token', 'bots_webhook_token_idx');
      table.index('creator_id', 'bots_creator_id_idx');
      table.index('is_active', 'bots_is_active_idx');

      // 外键约束
      table
        .foreign('default_data_source_id')
        .references('id')
        .inTable('datasources')
        .onDelete('SET NULL');
      table.foreign('ai_provider_id').references('id').inTable('ai_providers').onDelete('SET NULL');
      table.foreign('creator_id').references('id').inTable('users').onDelete('SET NULL');
      table.foreign('updater_id').references('id').inTable('users').onDelete('SET NULL');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
