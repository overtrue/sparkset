import { apiPost } from '@/lib/fetch';
import useSWRMutation from 'swr/mutation';
import type {
  QueryRequest as ApiQueryRequest,
  QueryResponse as ApiQueryResponse,
} from '@/types/api';
import { QUERY_REQUEST_LIMIT_MAX, QUERY_REQUEST_QUESTION_MAX_LENGTH } from '@sparkset/core';

export type QueryRequest = ApiQueryRequest;
export type QueryResponse = ApiQueryResponse;
export { QUERY_REQUEST_LIMIT_MAX, QUERY_REQUEST_QUESTION_MAX_LENGTH };

const toPositiveInt = (
  value: number | string | undefined,
  fieldName: string,
): number | undefined => {
  if (value === undefined) return undefined;

  const normalized = Number(value);
  if (!Number.isFinite(normalized) || !Number.isInteger(normalized) || normalized < 1) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return normalized;
};

const toLimitedInt = (
  value: number | undefined,
  fieldName: string,
  max: number,
): number | undefined => {
  const normalized = toPositiveInt(value, fieldName);
  if (normalized === undefined) return undefined;

  if (normalized > max) {
    throw new Error(`${fieldName} must be less than or equal to ${max}`);
  }

  return normalized;
};

export type QueryRequestInput = QueryRequest;

export async function runQuery(body: QueryRequest): Promise<QueryResponse> {
  return apiPost('/query', body);
}

export function normalizeQueryRequest(body: QueryRequestInput): QueryRequest {
  const question = body.question?.trim();
  if (!question) {
    throw new Error('question is required');
  }
  if (question.length > QUERY_REQUEST_QUESTION_MAX_LENGTH) {
    throw new Error(`question must not exceed ${QUERY_REQUEST_QUESTION_MAX_LENGTH} characters`);
  }

  const conversationId = toPositiveInt(body.conversationId, 'conversationId');

  return {
    question,
    ...(conversationId ? { conversationId } : undefined),
    datasource: toPositiveInt(body.datasource, 'datasource'),
    action: toPositiveInt(body.action, 'action'),
    limit: toLimitedInt(body.limit, 'limit', QUERY_REQUEST_LIMIT_MAX),
    aiProvider: toPositiveInt(body.aiProvider, 'aiProvider'),
  };
}

// SWR Mutation Hook
export function useRunQuery() {
  return useSWRMutation('/query', async (_, { arg }: { arg: QueryRequest }) => {
    return runQuery(arg);
  });
}
