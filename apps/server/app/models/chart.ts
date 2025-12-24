import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Dataset from './dataset.js';
import type { ChartSpec } from '../types/chart.js';

export default class Chart extends BaseModel {
  static table = 'charts';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare datasetId: number;

  @column()
  declare title: string;

  @column()
  declare description: string | null;

  @column()
  declare chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';

  @column({ prepare: (value) => JSON.stringify(value) })
  declare specJson: ChartSpec;

  @column()
  declare ownerId: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime<true>;

  // 关联关系
  @belongsTo(() => Dataset)
  declare dataset: BelongsTo<typeof Dataset>;
}
