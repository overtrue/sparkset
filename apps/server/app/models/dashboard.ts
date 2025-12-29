import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm';
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import DashboardWidget from './dashboard_widget.js';
import User from './user.js';

export default class Dashboard extends BaseModel {
  static table = 'dashboards';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare title: string;

  @column()
  declare description: string | null;

  @column()
  declare ownerId: number | null;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime<true>;

  // 关联关系
  @hasMany(() => DashboardWidget)
  declare widgets: HasMany<typeof DashboardWidget>;

  @column()
  declare creatorId: number | null;

  @column()
  declare updaterId: number | null;

  @belongsTo(() => User, { foreignKey: 'creatorId' })
  declare creator: BelongsTo<typeof User>;

  @belongsTo(() => User, { foreignKey: 'updaterId' })
  declare updater: BelongsTo<typeof User>;
}
