import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'actions';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.string('name', 191).notNullable();
      table.text('description').nullable();
      table.string('type', 32).notNullable();
      table.json('payload').notNullable();
      table.json('parameters').nullable();
      table.json('input_schema').nullable();
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.index('type');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
