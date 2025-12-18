import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'column_definitions';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table
        .integer('table_schema_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('table_schemas')
        .onDelete('CASCADE');
      table.integer('ordinal_position').unsigned().notNullable().defaultTo(0);
      table.string('name', 191).notNullable();
      table.string('data_type', 128).notNullable();
      table.text('column_comment').nullable();
      table.text('semantic_description').nullable();
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.unique(['table_schema_id', 'name']);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
