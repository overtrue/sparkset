import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Dataset from './dataset.js';
import User from './user.js';
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
  declare chartType: 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'radial' | 'table';

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

  @column()
  declare creatorId: number | null;

  @column()
  declare updaterId: number | null;

  @belongsTo(() => User, { foreignKey: 'creatorId' })
  declare creator: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: 'updaterId' })
  declare updater: BelongsTo<typeof User>;
}
