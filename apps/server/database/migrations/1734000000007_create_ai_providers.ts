import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'ai_providers';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.string('name', 191).notNullable().unique();
      table.string('type', 32).notNullable();
      table.string('api_key', 256).nullable();
      table.string('base_url', 512).nullable();
      table.string('default_model', 128).nullable();
      table.boolean('is_default').defaultTo(false);
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
