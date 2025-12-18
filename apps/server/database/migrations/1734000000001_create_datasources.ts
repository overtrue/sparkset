import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'datasources';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.string('name', 128).notNullable().unique();
      table.string('type', 32).notNullable();
      table.string('host', 191).notNullable();
      table.integer('port').unsigned().notNullable().defaultTo(3306);
      table.string('username', 128).notNullable();
      table.string('password', 256).notNullable();
      table.string('database', 128).notNullable();
      table.boolean('is_default').defaultTo(false);
      table.dateTime('last_sync_at').nullable();
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
