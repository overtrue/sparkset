import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected grantsTable = 'datasource_grants';
  protected datasourcesTable = 'datasources';

  async up() {
    const hasCreatorId = await this.schema.hasColumn(this.datasourcesTable, 'creator_id');
    if (!hasCreatorId) {
      this.schema.alterTable(this.datasourcesTable, (table) => {
        table.integer('creator_id').unsigned().nullable();
        table.integer('updater_id').unsigned().nullable();
        table.foreign('creator_id').references('id').inTable('users').onDelete('SET NULL');
        table.foreign('updater_id').references('id').inTable('users').onDelete('SET NULL');
        table.index(['creator_id'], 'datasources_creator_id_idx');
        table.index(['updater_id'], 'datasources_updater_id_idx');
      });
    }

    const hasGrantsTable = await this.schema.hasTable(this.grantsTable);
    if (!hasGrantsTable) {
      this.schema.createTable(this.grantsTable, (table) => {
        table.increments('id').primary();
        table
          .integer('datasource_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('datasources')
          .onDelete('CASCADE');
        table.string('subject_type', 16).notNullable();
        table.string('subject_id', 191).notNullable();
        table.json('permissions').notNullable();
        table.integer('created_by').unsigned().nullable();
        table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('created_at', { useTz: false }).notNullable().defaultTo(this.now());
        table.timestamp('updated_at', { useTz: false }).notNullable().defaultTo(this.now());

        table.unique(['datasource_id', 'subject_type', 'subject_id'], {
          indexName: 'datasource_grants_subject_unique',
        });
        table.index(['datasource_id'], 'datasource_grants_datasource_id_idx');
        table.index(['subject_type', 'subject_id'], 'datasource_grants_subject_idx');
      });
    }
  }

  async down() {
    const hasGrantsTable = await this.schema.hasTable(this.grantsTable);
    if (hasGrantsTable) {
      this.schema.dropTable(this.grantsTable);
    }

    const hasCreatorId = await this.schema.hasColumn(this.datasourcesTable, 'creator_id');
    if (hasCreatorId) {
      this.schema.alterTable(this.datasourcesTable, (table) => {
        table.dropForeign(['creator_id']);
        table.dropForeign(['updater_id']);
        table.dropIndex(['creator_id'], 'datasources_creator_id_idx');
        table.dropIndex(['updater_id'], 'datasources_updater_id_idx');
        table.dropColumn('creator_id');
        table.dropColumn('updater_id');
      });
    }
  }
}
