import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'table_schemas';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table
        .integer('datasource_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('datasources')
        .onDelete('CASCADE');
      table.string('table_name', 191).notNullable();
      table.text('table_comment').nullable();
      table.text('semantic_description').nullable();
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.unique(['datasource_id', 'table_name']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
