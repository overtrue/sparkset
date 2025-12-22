import type {
  Dashboard,
  DashboardWidget,
  ChartWidgetConfig,
  DatasetWidgetConfig,
  TextWidgetConfig,
} from '@/types/dashboard';
import { API_BASE_URL } from '@/lib/config';

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

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
  layouts: Array<{
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}

export const dashboardsApi = {
  // 列表
  list: async (): Promise<{ items: Dashboard[] }> => {
    const res = await fetch(apiUrl('/api/dashboards'));
    if (!res.ok) throw new Error('Failed to fetch dashboards');
    return res.json();
  },

  // 详情
  get: async (id: number): Promise<Dashboard> => {
    const res = await fetch(apiUrl(`/api/dashboards/${id}`));
    if (!res.ok) throw new Error('Failed to fetch dashboard');
    return res.json();
  },

  // 创建
  create: async (data: CreateDashboardDto): Promise<Dashboard> => {
    const res = await fetch(apiUrl('/api/dashboards'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create dashboard');
    return res.json();
  },

  // 更新
  update: async (id: number, data: Partial<CreateDashboardDto>): Promise<Dashboard> => {
    const res = await fetch(apiUrl(`/api/dashboards/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update dashboard');
    return res.json();
  },

  // 删除
  delete: async (id: number): Promise<void> => {
    const res = await fetch(apiUrl(`/api/dashboards/${id}`), { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete dashboard');
  },

  // 添加 Widget
  addWidget: async (dashboardId: number, data: CreateWidgetDto): Promise<DashboardWidget> => {
    const res = await fetch(apiUrl(`/api/dashboards/${dashboardId}/widgets`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add widget');
    return res.json();
  },

  // 更新 Widget
  updateWidget: async (
    dashboardId: number,
    widgetId: number,
    data: Partial<CreateWidgetDto>,
  ): Promise<DashboardWidget> => {
    const res = await fetch(apiUrl(`/api/dashboards/${dashboardId}/widgets/${widgetId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update widget');
    return res.json();
  },

  // 删除 Widget
  deleteWidget: async (dashboardId: number, widgetId: number): Promise<void> => {
    const res = await fetch(apiUrl(`/api/dashboards/${dashboardId}/widgets/${widgetId}`), {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete widget');
  },

  // 更新布局
  updateLayout: async (dashboardId: number, data: UpdateLayoutDto): Promise<void> => {
    const res = await fetch(apiUrl(`/api/dashboards/${dashboardId}/widgets/layout`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update layout');
  },

  // 刷新 Widget
  refreshWidget: async (dashboardId: number, widgetId: number): Promise<{ valid: boolean }> => {
    const res = await fetch(apiUrl(`/api/dashboards/${dashboardId}/widgets/${widgetId}/refresh`), {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to refresh widget');
    return res.json();
  },
};
