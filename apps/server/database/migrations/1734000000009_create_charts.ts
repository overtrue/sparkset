import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'charts';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 关联数据集
      table
        .integer('dataset_id')
        .unsigned()
        .references('id')
        .inTable('datasets')
        .onDelete('CASCADE')
        .notNullable();

      table.string('title', 128).notNullable();
      table.text('description').nullable();

      // 图表类型
      table.enum('chart_type', ['line', 'bar', 'area', 'pie', 'table']).notNullable();

      // ChartSpec 配置（JSON）
      table.json('spec_json').notNullable();

      // 所有者
      table.integer('owner_id').unsigned().nullable();

      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index(['dataset_id'], 'idx_charts_dataset_id');
      table.index(['owner_id'], 'idx_charts_owner_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
