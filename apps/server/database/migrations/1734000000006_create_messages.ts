import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'conversation_messages';

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table
        .integer('conversation_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('conversations')
        .onDelete('CASCADE');
      table.string('role', 32).notNullable();
      table.text('content').notNullable();
      table.json('metadata').nullable();
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
      table.index('conversation_id');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
