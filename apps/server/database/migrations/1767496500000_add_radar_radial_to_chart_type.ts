import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'charts';

  async up() {
    // MySQL requires recreating the ENUM to add new values
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      MODIFY COLUMN chart_type ENUM('line', 'bar', 'area', 'pie', 'radar', 'radial', 'table') NOT NULL
    `);
  }

  async down() {
    // Revert to original ENUM values
    await this.db.rawQuery(`
      ALTER TABLE ${this.tableName}
      MODIFY COLUMN chart_type ENUM('line', 'bar', 'area', 'pie', 'table') NOT NULL
    `);
  }
}
