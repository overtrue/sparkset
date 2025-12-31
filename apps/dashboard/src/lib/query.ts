import { apiPost } from '@/lib/fetch';
import useSWRMutation from 'swr/mutation';

export interface QueryRequest {
  question: string;
  datasource?: number;
  action?: number;
  limit?: number;
  aiProvider?: number;
}

export interface QueryResponse {
  sql: string;
  rows: Record<string, unknown>[];
  summary?: string;
}

export async function runQuery(body: QueryRequest): Promise<QueryResponse> {
  return apiPost('/query', body);
}

// SWR Mutation Hook
export function useRunQuery() {
  return useSWRMutation('/query', async (_, { arg }: { arg: QueryRequest }) => {
    return runQuery(arg);
  });
}
