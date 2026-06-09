import { inject } from '@adonisjs/core';
import Chart from '../models/chart.js';
import type Dashboard from '../models/dashboard.js';
import DashboardWidget, { type WidgetConfig, type WidgetType } from '../models/dashboard_widget.js';
import Dataset from '../models/dataset.js';
import { AuthorizationService } from './authorization_service.js';
import type { AuthorizationAction, AuthorizationUser } from '../types/authorization.js';

type ChartLike = Chart | { id?: number; datasetId?: number; dataset?: { datasourceId?: number } };
type DashboardLike = Dashboard | { id?: number; widgets?: WidgetLike[] };
type WidgetLike = DashboardWidget | { id?: number; type: WidgetType; config: WidgetConfig };

@inject()
export class DerivedResourceAuthorizationService {
  constructor(private authorization: AuthorizationService) {}

  async canAccessDataset(
    user: AuthorizationUser,
    datasetId: number,
    action: AuthorizationAction,
  ): Promise<boolean> {
    const datasourceId = await this.datasourceIdForDataset(datasetId);
    if (!datasourceId) return false;
    return this.canAccessDatasource(user, datasourceId, action);
  }

  async canAccessChart(
    user: AuthorizationUser,
    chart: ChartLike,
    action: AuthorizationAction,
  ): Promise<boolean> {
    const datasourceId = await this.datasourceIdForChart(chart);
    if (!datasourceId) return false;
    return this.canAccessDatasource(user, datasourceId, action);
  }

  async canAccessDashboard(
    user: AuthorizationUser,
    dashboard: DashboardLike,
    action: AuthorizationAction,
  ): Promise<boolean> {
    const datasourceIds = await this.datasourceIdsForDashboard(dashboard);
    return this.canAccessDatasourceIds(user, datasourceIds, action);
  }

  async canAccessWidget(
    user: AuthorizationUser,
    widget: WidgetLike,
    action: AuthorizationAction,
  ): Promise<boolean> {
    const datasourceIds = await this.datasourceIdsForWidget(widget);
    return this.canAccessDatasourceIds(user, datasourceIds, action);
  }

  async canAccessWidgetConfig(
    user: AuthorizationUser,
    type: WidgetType,
    config: WidgetConfig,
    action: AuthorizationAction,
  ): Promise<boolean> {
    const datasourceIds = await this.datasourceIdsForWidgetConfig(type, config);
    return this.canAccessDatasourceIds(user, datasourceIds, action);
  }

  async canAccessDatasource(
    user: AuthorizationUser,
    datasourceId: number,
    action: AuthorizationAction,
  ): Promise<boolean> {
    return this.authorization.can(user, action, { type: 'datasource', id: datasourceId });
  }

  async canAccessDatasourceIds(
    user: AuthorizationUser,
    datasourceIds: number[],
    action: AuthorizationAction,
  ): Promise<boolean> {
    const uniqueIds = Array.from(new Set(datasourceIds.filter((id) => Number.isFinite(id))));
    for (const datasourceId of uniqueIds) {
      if (!(await this.canAccessDatasource(user, datasourceId, action))) {
        return false;
      }
    }
    return true;
  }

  private async datasourceIdForDataset(datasetId: number): Promise<number | null> {
    const dataset = await Dataset.find(datasetId);
    return dataset?.datasourceId ?? null;
  }

  private async datasourceIdForChart(chart: ChartLike): Promise<number | null> {
    if (chart.dataset?.datasourceId) {
      return chart.dataset.datasourceId;
    }
    if (chart.datasetId) {
      return this.datasourceIdForDataset(chart.datasetId);
    }
    if (chart.id) {
      const record = await Chart.query().preload('dataset').where('id', chart.id).first();
      if (!record) return null;
      return this.datasourceIdForChart(record);
    }
    return null;
  }

  private async datasourceIdsForDashboard(dashboard: DashboardLike): Promise<number[]> {
    const widgets =
      dashboard.widgets ??
      (dashboard.id ? await DashboardWidget.query().where('dashboard_id', dashboard.id) : []);

    const datasourceIds: number[] = [];
    for (const widget of widgets) {
      datasourceIds.push(...(await this.datasourceIdsForWidget(widget)));
    }
    return datasourceIds;
  }

  private async datasourceIdsForWidget(widget: WidgetLike): Promise<number[]> {
    return this.datasourceIdsForWidgetConfig(widget.type, widget.config);
  }

  private async datasourceIdsForWidgetConfig(
    type: WidgetType,
    config: WidgetConfig,
  ): Promise<number[]> {
    if (type === 'dataset') {
      const datasetConfig = config as { datasetId?: number };
      const datasourceId = datasetConfig.datasetId
        ? await this.datasourceIdForDataset(datasetConfig.datasetId)
        : null;
      return datasourceId ? [datasourceId] : [];
    }

    if (type === 'chart') {
      const chartConfig = config as { chartId?: number };
      const datasourceId = chartConfig.chartId
        ? await this.datasourceIdForChart({ id: chartConfig.chartId })
        : null;
      return datasourceId ? [datasourceId] : [];
    }

    return [];
  }
}
