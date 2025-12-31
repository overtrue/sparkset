import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { CreateDatasetDto } from '@/types/api';
import {
  fetchDatasets,
  fetchDatasetById,
  createDataset,
  updateDataset,
  deleteDataset,
  previewDataset,
} from './datasets-api';

// SWR Hooks - only for client components
export function useDatasets() {
  return useSWR('/api/datasets', fetchDatasets);
}

export function useDataset(id: number | null) {
  return useSWR(id ? `/api/datasets/${id}` : null, () => fetchDatasetById(id!));
}

// Mutations
export function useCreateDataset() {
  return useSWRMutation('/api/datasets', async (_, { arg }: { arg: CreateDatasetDto }) => {
    return createDataset(arg);
  });
}

export function useUpdateDataset() {
  return useSWRMutation(
    '/api/datasets',
    async (_, { arg }: { arg: { id: number; data: Partial<CreateDatasetDto> } }) => {
      return updateDataset(arg.id, arg.data);
    },
  );
}

export function useDeleteDataset() {
  return useSWRMutation('/api/datasets', async (_, { arg }: { arg: number }) => {
    return deleteDataset(arg);
  });
}

export function usePreviewDataset() {
  return useSWRMutation(
    '/api/datasets',
    async (_, { arg }: { arg: { id: number; params?: Record<string, unknown> } }) => {
      return previewDataset(arg.id, arg.params);
    },
  );
}
