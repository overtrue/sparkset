import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'access_tokens';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('cascade');
      table.string('identifier').notNullable();
      table.string('token_hash').notNullable().unique();
      table.timestamp('expires_at').nullable();
      table.timestamp('last_used_at').nullable();
      table.boolean('is_test').defaultTo(false);
      table.string('user_agent').nullable();
      table.string('ip_address').nullable();
      table.timestamp('created_at', { useTz: true });
      table.timestamp('updated_at', { useTz: true });

      // 索引
      table.index(['user_id'], 'access_tokens_user_id_idx');
      table.index(['token_hash'], 'access_tokens_token_hash_idx');
      table.index(['expires_at'], 'access_tokens_expires_at_idx');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
