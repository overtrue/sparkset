import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { CreateDatasourceDto, TestConnectionDto } from '@/types/api';
import {
  fetchDatasources,
  fetchDatasourceById,
  createDatasource,
  updateDatasource,
  deleteDatasource,
  testConnection,
  syncDatasource,
  setDefaultDatasource,
} from './datasources-api';

// SWR Hooks - only for client components
export function useDatasources() {
  return useSWR('/datasources', fetchDatasources);
}

export function useDatasource(id: number | null) {
  return useSWR(id ? `/datasources/${id}` : null, () => fetchDatasourceById(id!));
}

// Mutations
export function useCreateDatasource() {
  return useSWRMutation('/datasources', async (_, { arg }: { arg: CreateDatasourceDto }) => {
    return createDatasource(arg);
  });
}

export function useUpdateDatasource() {
  return useSWRMutation(
    '/datasources',
    async (_, { arg }: { arg: { id: number; data: Partial<CreateDatasourceDto> } }) => {
      return updateDatasource(arg.id, arg.data);
    },
  );
}

export function useDeleteDatasource() {
  return useSWRMutation('/datasources', async (_, { arg }: { arg: number }) => {
    return deleteDatasource(arg);
  });
}

export function useTestConnection() {
  return useSWRMutation(
    '/datasources/test-connection',
    async (_, { arg }: { arg: TestConnectionDto }) => {
      return testConnection(arg);
    },
  );
}

export function useSyncDatasource() {
  return useSWRMutation('/datasources/sync', async (_, { arg }: { arg: number }) => {
    return syncDatasource(arg);
  });
}

export function useSetDefaultDatasource() {
  return useSWRMutation('/datasources/set-default', async (_, { arg }: { arg: number }) => {
    return setDefaultDatasource(arg);
  });
}
