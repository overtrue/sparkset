import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type {
  CreateDatasourceDto,
  GrantSubjectType,
  TestConnectionDto,
  UpsertDatasourceGrantDto,
} from '@/types/api';
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
import {
  deleteDatasourceGrant,
  fetchDatasourceGrants,
  upsertDatasourceGrant,
} from './datasource-grants-api';

// SWR Hooks - only for client components
export function useDatasources() {
  return useSWR('/datasources', fetchDatasources);
}

export function useDatasource(id: number | null) {
  return useSWR(id ? `/datasources/${id}` : null, () => fetchDatasourceById(id!));
}

export function useDatasourceGrants(id: number | null) {
  return useSWR(id ? `/datasources/${id}/grants` : null, () => fetchDatasourceGrants(id!));
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

export function useUpsertDatasourceGrant(datasourceId: number | null) {
  return useSWRMutation(
    datasourceId ? `/datasources/${datasourceId}/grants` : null,
    async (_, { arg }: { arg: UpsertDatasourceGrantDto }) => {
      return upsertDatasourceGrant(datasourceId!, arg);
    },
  );
}

export function useDeleteDatasourceGrant(datasourceId: number | null) {
  return useSWRMutation(
    datasourceId ? `/datasources/${datasourceId}/grants` : null,
    async (_, { arg }: { arg: { subjectType: GrantSubjectType; subjectId: string } }) => {
      return deleteDatasourceGrant(datasourceId!, arg.subjectType, arg.subjectId);
    },
  );
}
