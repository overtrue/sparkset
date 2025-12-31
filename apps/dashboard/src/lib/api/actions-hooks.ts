import type { CreateActionInput, UpdateActionInput, GenerateActionSQLInput } from '@/types/api';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import {
  fetchActions,
  fetchActionById,
  createAction,
  updateAction,
  deleteAction,
  executeAction,
  generateActionSQL,
} from './actions-api';

// SWR Hooks - only for client components
export function useActions() {
  return useSWR('/actions', fetchActions);
}

export function useAction(id: number | null) {
  return useSWR(id ? `/actions/${id}` : null, () => fetchActionById(id!));
}

// Mutations
export function useCreateAction() {
  return useSWRMutation('/actions', async (_, { arg }: { arg: CreateActionInput }) => {
    return createAction(arg);
  });
}

export function useUpdateAction() {
  return useSWRMutation('/actions', async (_, { arg }: { arg: UpdateActionInput }) => {
    return updateAction(arg);
  });
}

export function useDeleteAction() {
  return useSWRMutation('/actions', async (_, { arg }: { arg: number }) => {
    return deleteAction(arg);
  });
}

export function useExecuteAction() {
  return useSWRMutation(
    '/actions/execute',
    async (_, { arg }: { arg: { id: number; parameters?: unknown } }) => {
      return executeAction(arg.id, arg.parameters);
    },
  );
}

export function useGenerateActionSQL() {
  return useSWRMutation(
    '/actions/generate-sql',
    async (_, { arg }: { arg: GenerateActionSQLInput }) => {
      return generateActionSQL(arg);
    },
  );
}
