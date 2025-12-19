import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'datasets';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 关联数据源（复用现有）
      table
        .integer('datasource_id')
        .unsigned()
        .references('id')
        .inTable('datasources')
        .onDelete('CASCADE')
        .notNullable();

      table.string('name', 128).notNullable();
      table.text('description').nullable();

      // SQL 查询定义
      table.text('query_sql').notNullable();

      // Schema 定义（JSON）
      table.json('schema_json').notNullable();

      // Schema Hash（用于版本检测）
      table.string('schema_hash', 64).notNullable();

      // 所有者
      table.integer('owner_id').unsigned().nullable();

      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index(['datasource_id'], 'idx_datasets_datasource_id');
      table.index(['owner_id'], 'idx_datasets_owner_id');
      table.index(['schema_hash'], 'idx_datasets_schema_hash');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
