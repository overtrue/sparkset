import type { Chart, ChartSpec, ChartRenderResult } from '@/types/chart';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

export interface CreateChartDto {
  datasetId: number;
  title: string;
  description?: string;
  chartType: ChartSpec['chartType'];
  spec: ChartSpec;
}

// API functions - can be used in both server and client components
export async function fetchCharts(datasetId?: number): Promise<{ items: Chart[] }> {
  const url = datasetId ? `/api/charts?datasetId=${datasetId}` : '/api/charts';
  return apiGet(url);
}

export async function fetchChart(id: number): Promise<Chart> {
  return apiGet(`/api/charts/${id}`);
}

export async function createChart(data: CreateChartDto): Promise<Chart> {
  return apiPost('/api/charts', data);
}

export async function updateChart(id: number, data: Partial<CreateChartDto>): Promise<Chart> {
  return apiPut(`/api/charts/${id}`, data);
}

export async function deleteChart(id: number): Promise<void> {
  return apiDelete(`/api/charts/${id}`);
}

export async function renderChart(id: number, useCache = true): Promise<ChartRenderResult> {
  return apiGet(`/api/charts/${id}/render?useCache=${useCache}`);
}

export async function previewChart(data: {
  datasetRef: { datasetId: number };
  spec: ChartSpec;
}): Promise<ChartRenderResult> {
  return apiPost('/api/charts/preview', data);
}

// Legacy API object for backward compatibility - safe for server components
export const chartsApi = {
  list: fetchCharts,
  get: fetchChart,
  create: createChart,
  update: updateChart,
  delete: deleteChart,
  render: renderChart,
  preview: previewChart,
};
