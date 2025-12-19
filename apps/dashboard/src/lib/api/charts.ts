import type { Chart, ChartSpec, ChartRenderResult } from '@/types/chart';
import { API_BASE_URL } from '@/lib/config';

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export interface CreateChartDto {
  datasetId: number;
  title: string;
  description?: string;
  chartType: ChartSpec['chartType'];
  spec: ChartSpec;
}

export const chartsApi = {
  // 列表
  list: async (datasetId?: number): Promise<{ items: Chart[] }> => {
    const url = datasetId ? `/api/charts?datasetId=${datasetId}` : '/api/charts';
    const res = await fetch(apiUrl(url));
    if (!res.ok) throw new Error('Failed to fetch charts');
    return res.json();
  },

  // 详情
  get: async (id: number): Promise<Chart> => {
    const res = await fetch(apiUrl(`/api/charts/${id}`));
    if (!res.ok) throw new Error('Failed to fetch chart');
    return res.json();
  },

  // 创建
  create: async (data: CreateChartDto): Promise<Chart> => {
    const res = await fetch(apiUrl('/api/charts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create chart');
    return res.json();
  },

  // 更新
  update: async (id: number, data: Partial<CreateChartDto>): Promise<Chart> => {
    const res = await fetch(apiUrl(`/api/charts/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update chart');
    return res.json();
  },

  // 删除
  delete: async (id: number): Promise<void> => {
    const res = await fetch(apiUrl(`/api/charts/${id}`), { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete chart');
  },

  // 渲染（从保存的配置）
  render: async (id: number, useCache = true): Promise<ChartRenderResult> => {
    const url = `/api/charts/${id}/render?useCache=${useCache}`;
    const res = await fetch(apiUrl(url));
    if (!res.ok) throw new Error('Failed to render chart');
    return res.json();
  },

  // 预览（不保存）
  preview: async (data: {
    datasetRef: { datasetId: number };
    spec: ChartSpec;
  }): Promise<ChartRenderResult> => {
    const res = await fetch(apiUrl('/api/charts/preview'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to preview chart');
    return res.json();
  },
};
