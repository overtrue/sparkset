import { inject } from '@adonisjs/core';
import type Chart from '../models/chart.js';
import Dataset from '../models/dataset.js';
import { AuthorizationService } from './authorization_service.js';
import type { AuthorizationAction, AuthorizationUser } from '../types/authorization.js';

type ChartLike = Chart | { id?: number; datasetId?: number; dataset?: { datasourceId?: number } };

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

  async canAccessDatasource(
    user: AuthorizationUser,
    datasourceId: number,
    action: AuthorizationAction,
  ): Promise<boolean> {
    return this.authorization.can(user, action, { type: 'datasource', id: datasourceId });
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
    return null;
  }
}
