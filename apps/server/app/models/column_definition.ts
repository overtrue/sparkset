import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import TableSchema from './table_schema.js';

export default class ColumnDefinition extends BaseModel {
  static table = 'column_definitions';

  @column({ isPrimary: true })
  declare id: number;

  @column({ columnName: 'table_schema_id' })
  declare tableSchemaId: number;

  @column({ columnName: 'ordinal_position' })
  declare ordinalPosition: number;

  @column()
  declare name: string;

  @column({ columnName: 'data_type' })
  declare dataType: string;

  @column({ columnName: 'column_comment' })
  declare columnComment: string | null;

  @column({ columnName: 'semantic_description' })
  declare semanticDescription: string | null;

  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  declare updatedAt: DateTime<true>;

  @belongsTo(() => TableSchema)
  declare tableSchema: BelongsTo<typeof TableSchema>;
}
