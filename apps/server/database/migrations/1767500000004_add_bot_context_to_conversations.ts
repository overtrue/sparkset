import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'conversations';

  async up() {
    this.schema.table(this.tableName, (table) => {
      // Add bot_id to track which bot this conversation belongs to
      table.integer('bot_id').unsigned().nullable().after('user_id');
      table.foreign('bot_id').references('bots.id').onDelete('SET NULL');

      // Add external_user_id to maintain conversation continuity across sessions
      table.string('external_user_id', 255).nullable().after('bot_id');

      // Create composite index for efficient lookup
      table.index(['bot_id', 'external_user_id'], 'idx_conversations_bot_external_user');
    });
  }

  async down() {
    this.schema.table(this.tableName, (table) => {
      table.dropIndex(['bot_id', 'external_user_id'], 'idx_conversations_bot_external_user');
      table.dropForeign(['bot_id']);
      table.dropColumn('external_user_id');
      table.dropColumn('bot_id');
    });
  }
}
