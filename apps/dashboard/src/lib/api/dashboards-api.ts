import type {
  Dashboard,
  DashboardWidget,
  ChartWidgetConfig,
  DatasetWidgetConfig,
  TextWidgetConfig,
} from '@/types/dashboard';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

export interface CreateDashboardDto {
  title: string;
  description?: string;
}

export interface CreateWidgetDto {
  title: string;
  type: 'chart' | 'dataset' | 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  config: ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;
  order?: number;
}

export interface UpdateLayoutDto {
  layouts: {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }[];
}

// API functions - can be used in both server and client components
export async function fetchDashboards(): Promise<{ items: Dashboard[] }> {
  return apiGet('/api/dashboards');
}

export async function fetchDashboard(id: number): Promise<Dashboard> {
  return apiGet(`/api/dashboards/${id}`);
}

export async function createDashboard(data: CreateDashboardDto): Promise<Dashboard> {
  return apiPost('/api/dashboards', data);
}

export async function updateDashboard(
  id: number,
  data: Partial<CreateDashboardDto>,
): Promise<Dashboard> {
  return apiPut(`/api/dashboards/${id}`, data);
}

export async function deleteDashboard(id: number): Promise<void> {
  return apiDelete(`/api/dashboards/${id}`);
}

export async function addWidget(
  dashboardId: number,
  data: CreateWidgetDto,
): Promise<DashboardWidget> {
  return apiPost(`/api/dashboards/${dashboardId}/widgets`, data);
}

export async function updateWidget(
  dashboardId: number,
  widgetId: number,
  data: Partial<CreateWidgetDto>,
): Promise<DashboardWidget> {
  return apiPut(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, data);
}

export async function deleteWidget(dashboardId: number, widgetId: number): Promise<void> {
  return apiDelete(`/api/dashboards/${dashboardId}/widgets/${widgetId}`);
}

export async function updateLayout(dashboardId: number, data: UpdateLayoutDto): Promise<void> {
  return apiPut(`/api/dashboards/${dashboardId}/widgets/layout`, data);
}

export async function refreshWidget(
  dashboardId: number,
  widgetId: number,
): Promise<{ valid: boolean }> {
  return apiPost(`/api/dashboards/${dashboardId}/widgets/${widgetId}/refresh`);
}

// Legacy API object for backward compatibility - safe for server components
export const dashboardsApi = {
  list: fetchDashboards,
  get: fetchDashboard,
  create: createDashboard,
  update: updateDashboard,
  delete: deleteDashboard,
  addWidget,
  updateWidget,
  deleteWidget,
  updateLayout,
  refreshWidget,
};
