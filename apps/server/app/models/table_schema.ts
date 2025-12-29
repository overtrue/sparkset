import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import ColumnDefinition from './column_definition.js';
import DataSource from './data_source.js';
import User from './user.js';

export default class TableSchema extends BaseModel {
  static table = 'table_schemas';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'datasource_id' })
  declare datasourceId: number;

  @column({ columnName: 'table_name' })
  declare tableName: string;

  @column({ columnName: 'table_comment' })
  declare tableComment: string | null;

  @column({ columnName: 'semantic_description' })
  declare semanticDescription: string | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @belongsTo(() => DataSource)
  declare datasource: BelongsTo<typeof DataSource>;

  @hasMany(() => ColumnDefinition)
  declare columns: HasMany<typeof ColumnDefinition>;

  @column()
  declare creatorId: number | null;

  @column()
  declare updaterId: number | null;

  @belongsTo(() => User, { foreignKey: 'creatorId' })
  declare creator: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: 'updaterId' })
  declare updater: BelongsTo<typeof User>;
}
