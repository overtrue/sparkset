import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import DataSource from './data_source.js';
import type { ColumnDefinition } from '@sparkset/core';

export default class Dataset extends BaseModel {
  static table = 'datasets';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare datasourceId: number;

  @column()
  declare name: string;

  @column()
  declare description: string | null;

  @column()
  declare querySql: string;

  @column({ prepare: (value) => JSON.stringify(value) })
  declare schemaJson: ColumnDefinition[];

  @column()
  declare schemaHash: string;

  @column()
  declare ownerId: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  // 关联关系
  @belongsTo(() => DataSource)
  declare datasource: BelongsTo<typeof DataSource>;
}
