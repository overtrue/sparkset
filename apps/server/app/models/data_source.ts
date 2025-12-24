import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import TableSchema from './table_schema.js';

export default class DataSource extends BaseModel {
  static table = 'datasources';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare name: string;

  @column()
  declare type: string;

  @column()
  declare host: string;

  @column()
  declare port: number;

  @column()
  declare username: string;

  @column()
  declare password: string;

  @column()
  declare database: string;

  @column({ columnName: 'is_default' })
  declare isDefault: boolean;

  @column.dateTime({ columnName: 'last_sync_at' })
  declare lastSyncAt: DateTime<true> | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @hasMany(() => TableSchema)
  declare tableSchemas: HasMany<typeof TableSchema>;
}
