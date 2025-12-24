import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';
import Dashboard from './dashboard.js';

export type WidgetType = 'chart' | 'dataset' | 'text';

export interface ChartWidgetConfig {
  chartId: number;
}

export interface DatasetWidgetConfig {
  datasetId: number;
  maxRows?: number;
}

export interface TextWidgetConfig {
  content: string;
}

export type WidgetConfig = ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;

export default class DashboardWidget extends BaseModel {
  static table = 'dashboard_widgets';

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare dashboardId: number;

  @column()
  declare title: string;

  @column()
  declare type: WidgetType;

  @column()
  declare x: number;

  @column()
  declare y: number;

  @column()
  declare w: number;

  @column()
  declare h: number;

  @column({ columnName: 'config', prepare: (value) => JSON.stringify(value) })
  declare config: WidgetConfig;

  @column()
  declare order: number;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime<true>;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime<true>;

  // 关联关系
  @belongsTo(() => Dashboard)
  declare dashboard: BelongsTo<typeof Dashboard>;
}
