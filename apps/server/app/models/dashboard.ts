import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm';
import type { HasMany } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import DashboardWidget from './dashboard_widget.js';

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
}
