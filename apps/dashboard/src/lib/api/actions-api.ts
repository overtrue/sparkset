import type {
  ActionDTO,
  CreateActionInput,
  UpdateActionInput,
  GenerateActionSQLInput,
  GenerateActionSQLResult,
} from '@/types/api';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchActions(): Promise<{ items: ActionDTO[] }> {
  return apiGet('/actions');
}

export async function fetchActionById(id: number): Promise<ActionDTO> {
  return apiGet(`/actions/${id}`);
}

// Alias for backward compatibility
export const getAction = fetchActionById;

export async function createAction(payload: CreateActionInput): Promise<ActionDTO> {
  return apiPost('/actions', payload);
}

export async function updateAction(payload: UpdateActionInput): Promise<ActionDTO> {
  const { id, ...data } = payload;
  return apiPut(`/actions/${id}`, data);
}

export async function deleteAction(id: number): Promise<void> {
  return apiDelete(`/actions/${id}`);
}

export async function executeAction(id: number, parameters?: unknown): Promise<unknown> {
  return apiPost(`/actions/${id}/execute`, parameters ? { parameters } : undefined);
}

export async function generateActionSQL(
  input: GenerateActionSQLInput,
): Promise<GenerateActionSQLResult> {
  return apiPost('/actions/generate-sql', input);
}

// Legacy API object for backward compatibility - safe for server components
export const actionsApi = {
  list: fetchActions,
  get: fetchActionById,
  create: createAction,
  update: updateAction,
  delete: deleteAction,
  execute: executeAction,
  generateSQL: generateActionSQL,
};
