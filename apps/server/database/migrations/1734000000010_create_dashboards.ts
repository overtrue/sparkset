import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'dashboards';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      table.string('title', 128).notNullable();
      table.text('description').nullable();

      // 所有者
      table.integer('owner_id').unsigned().nullable();

      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index(['owner_id'], 'idx_dashboards_owner_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
