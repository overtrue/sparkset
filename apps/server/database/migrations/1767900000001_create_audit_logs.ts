import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'audit_logs';

  async up() {
    const hasTable = await this.schema.hasTable(this.tableName);
    if (hasTable) {
      return;
    }

    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary();
      table.integer('actor_user_id').unsigned().nullable();
      table.string('action', 128).notNullable();
      table.string('outcome', 32).notNullable();
      table.string('resource_type', 64).nullable();
      table.string('resource_id', 191).nullable();
      table.json('metadata').nullable();
      table.string('ip_address', 45).nullable();
      table.text('user_agent').nullable();
      table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());

      table.foreign('actor_user_id').references('id').inTable('users').onDelete('SET NULL');
      table.index(['actor_user_id'], 'audit_logs_actor_user_id_idx');
      table.index(['action'], 'audit_logs_action_idx');
      table.index(['resource_type', 'resource_id'], 'audit_logs_resource_idx');
      table.index(['created_at'], 'audit_logs_created_at_idx');
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
