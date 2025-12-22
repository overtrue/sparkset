import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'dashboard_widgets';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();

      // 关联仪表盘
      table
        .integer('dashboard_id')
        .unsigned()
        .references('id')
        .inTable('dashboards')
        .onDelete('CASCADE')
        .notNullable();

      table.string('title', 128).notNullable();

      // Widget 类型
      table.enum('type', ['chart', 'dataset', 'text']).notNullable();

      // Grid 布局位置和大小（基于最小格子 64x64px，以格子数为单位）
      table.integer('x').unsigned().notNullable().defaultTo(0);
      table.integer('y').unsigned().notNullable().defaultTo(0);
      table.integer('w').unsigned().notNullable().defaultTo(4);
      table.integer('h').unsigned().notNullable().defaultTo(3);

      // 类型特定的配置（JSON）
      // ChartWidget: { chartId: number }
      // DatasetWidget: { datasetId: number, maxRows?: number }
      // TextWidget: { content: string }
      table.json('config').notNullable();

      // 显示顺序
      table.integer('order').unsigned().notNullable().defaultTo(0);

      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

      // 索引
      table.index(['dashboard_id'], 'idx_dashboard_widgets_dashboard_id');
      table.index(['dashboard_id', 'order'], 'idx_dashboard_widgets_dashboard_order');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
