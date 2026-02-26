import {
  parseConversationMessageMetadata,
  getConversationMessageRowCount,
  type ParsedConversationMessageMetadata,
  QUERY_REQUEST_LIMIT_MAX,
} from '@sparkset/core';
import type { MessageDTO } from '@/types/api';
import type { QueryResponse } from '@/lib/query';

export interface ParsedMessageQueryMetadata {
  sql?: string;
  result?: QueryResponse;
  datasourceId?: number;
  resultRowCount?: number;
  resultSummary?: string;
}

export interface QueryTurn {
  index: number;
  metadata: ParsedConversationMessageMetadata | null;
  rowCount: number | null;
}

export interface QueryRerunContext {
  datasourceId?: number;
  aiProviderId?: number;
  limit?: number;
}

export const extractMessageQueryMetadata = (
  message: MessageDTO,
): ParsedMessageQueryMetadata | null => {
  const parsed = parseConversationMessageMetadata(message.metadata);
  const fallbackRowCount = getConversationMessageRowCount(message.metadata, message.content);
  const resultRowCount = parsed?.rowCount ?? (parsed?.hasResult === false ? 0 : fallbackRowCount);

  if (!parsed && resultRowCount === null) {
    return null;
  }

  return {
    sql: parsed?.sql,
    result: parsed?.result
      ? {
          ...parsed.result,
          sql: parsed.result.sql ?? '',
        }
      : undefined,
    datasourceId: parsed?.datasourceId,
    resultRowCount: resultRowCount ?? undefined,
    resultSummary: parsed?.summary,
  };
};

export const extractQueryTurns = (messages: MessageDTO[]): QueryTurn[] => {
  const turns: QueryTurn[] = [];

  for (let i = 0; i < messages.length; i++) {
    if (messages[i]?.role !== 'user') {
      continue;
    }

    const nextIndex = i + 1;
    const assistantMessage = messages[nextIndex];
    if (!assistantMessage || assistantMessage.role !== 'assistant') {
      continue;
    }

    const parsedMetadata = parseConversationMessageMetadata(assistantMessage.metadata);
    const fallbackRowCount = getConversationMessageRowCount(
      assistantMessage.metadata,
      assistantMessage.content,
    );
    const rowCount =
      parsedMetadata?.rowCount ?? (parsedMetadata?.hasResult === false ? 0 : fallbackRowCount);

    if (!parsedMetadata && rowCount === null) {
      continue;
    }

    turns.push({
      index: nextIndex,
      metadata: parsedMetadata,
      rowCount,
    });
  }

  return turns;
};

export const getRerunContextFromMetadata = (
  parsedMetadata: ParsedConversationMessageMetadata | null,
): QueryRerunContext => {
  return {
    datasourceId: parsedMetadata?.datasourceId,
    aiProviderId: parsedMetadata?.aiProviderId,
    limit: parsedMetadata?.limit
      ? Math.min(parsedMetadata.limit, QUERY_REQUEST_LIMIT_MAX)
      : undefined,
  };
};
