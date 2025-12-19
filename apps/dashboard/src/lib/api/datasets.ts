import type { Dataset, ResultSet } from '@/types/chart';
import { API_BASE_URL } from '@/lib/config';

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export interface CreateDatasetDto {
  datasourceId: number;
  name: string;
  description?: string;
  querySql: string;
  schemaJson: Array<{ name: string; type: string }>;
}

export const datasetsApi = {
  // 列表
  list: async (): Promise<{ items: Dataset[] }> => {
    const res = await fetch(apiUrl('/api/datasets'));
    if (!res.ok) throw new Error('Failed to fetch datasets');
    return res.json();
  },

  // 详情
  get: async (id: number): Promise<Dataset> => {
    const res = await fetch(apiUrl(`/api/datasets/${id}`));
    if (!res.ok) throw new Error('Failed to fetch dataset');
    return res.json();
  },

  // 创建
  create: async (data: CreateDatasetDto): Promise<Dataset> => {
    const res = await fetch(apiUrl('/api/datasets'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create dataset');
    return res.json();
  },

  // 更新
  update: async (id: number, data: Partial<CreateDatasetDto>): Promise<Dataset> => {
    const res = await fetch(apiUrl(`/api/datasets/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update dataset');
    return res.json();
  },

  // 删除
  delete: async (id: number): Promise<void> => {
    const res = await fetch(apiUrl(`/api/datasets/${id}`), { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete dataset');
  },

  // 预览执行
  preview: async (id: number, params?: Record<string, unknown>): Promise<ResultSet> => {
    const res = await fetch(apiUrl(`/api/datasets/${id}/preview`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
    });
    if (!res.ok) throw new Error('Failed to preview dataset');
    return res.json();
  },
};
