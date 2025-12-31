import type { ChartSpec } from '@/types/api';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { CreateChartDto } from '@/types/api';
import {
  fetchCharts,
  fetchChartById,
  createChart,
  updateChart,
  deleteChart,
  renderChart,
  previewChart,
} from './charts-api';

// SWR Hooks - only for client components
export function useCharts(datasetId?: number) {
  const key = datasetId ? `/api/charts?datasetId=${datasetId}` : '/api/charts';
  return useSWR(key, () => fetchCharts(datasetId));
}

export function useChart(id: number | null) {
  return useSWR(id ? `/api/charts/${id}` : null, () => fetchChartById(id!));
}

// Mutations
export function useCreateChart() {
  return useSWRMutation('/api/charts', async (_, { arg }: { arg: CreateChartDto }) => {
    return createChart(arg);
  });
}

export function useUpdateChart() {
  return useSWRMutation(
    '/api/charts',
    async (_, { arg }: { arg: { id: number; data: Partial<CreateChartDto> } }) => {
      return updateChart(arg.id, arg.data);
    },
  );
}

export function useDeleteChart() {
  return useSWRMutation('/api/charts', async (_, { arg }: { arg: number }) => {
    return deleteChart(arg);
  });
}

export function useRenderChart() {
  return useSWRMutation(
    '/api/charts',
    async (_, { arg }: { arg: { id: number; useCache?: boolean } }) => {
      return renderChart(arg.id, arg.useCache);
    },
  );
}

export function usePreviewChart() {
  return useSWRMutation(
    '/api/charts',
    async (_, { arg }: { arg: { datasetRef: { datasetId: number }; spec: ChartSpec } }) => {
      return previewChart(arg);
    },
  );
}
