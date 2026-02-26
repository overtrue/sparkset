import { describe, expect, it } from 'vitest';
import { QUERY_REQUEST_LIMIT_MAX } from '@sparkset/core';
import type { MessageDTO } from '@/types/api';
import {
  extractMessageQueryMetadata,
  extractQueryTurns,
  getRerunContextFromMetadata,
} from './query-message-metadata';

const messageWithMetadata = (overrides: Partial<MessageDTO> = {}): MessageDTO => ({
  id: 1,
  conversationId: 10,
  role: 'assistant',
  content: 'Query executed successfully, returned 3 rows',
  metadata: {},
  createdAt: '2026-02-26T00:00:00.000Z',
  ...overrides,
});

describe('query-message-metadata', () => {
  it('extractMessageQueryMetadata should read rowCount from structured metadata first', () => {
    const parsedMetadata = extractMessageQueryMetadata(
      messageWithMetadata({
        metadata: {
          kind: 'query-result',
          sql: 'SELECT * FROM orders',
          result: {
            sql: 'SELECT * FROM orders',
            rows: [{ id: 1 }, { id: 2 }],
            rowCount: 2,
            hasResult: true,
          },
          rowCount: 2,
          datasourceId: 5,
          hasResult: true,
        },
      }),
    );

    expect(parsedMetadata).toEqual(
      expect.objectContaining({
        sql: 'SELECT * FROM orders',
        datasourceId: 5,
        resultRowCount: 2,
      }),
    );
  });

  it('extractMessageQueryMetadata should fall back to message content when structured rowCount is missing', () => {
    const parsedMetadata = extractMessageQueryMetadata(
      messageWithMetadata({
        content: 'Query executed successfully, returned 12 rows',
        metadata: {
          kind: 'query-result',
          summary: 'Orders by region',
        },
      }),
    );

    expect(parsedMetadata?.resultRowCount).toBe(12);
  });

  it('extractMessageQueryMetadata should treat hasResult false as 0 rows when count is absent', () => {
    const parsedMetadata = extractMessageQueryMetadata(
      messageWithMetadata({
        content: 'showed no data',
        metadata: {
          kind: 'query-result',
          hasResult: false,
          summary: 'No rows returned',
        },
      }),
    );

    expect(parsedMetadata?.resultRowCount).toBe(0);
    expect(parsedMetadata?.resultSummary).toBe('No rows returned');
  });

  it('extractQueryTurns should extract user-assistant query turns with row counts', () => {
    const messages: MessageDTO[] = [
      {
        id: 1,
        conversationId: 10,
        role: 'user',
        content: 'how many orders',
        metadata: undefined,
        createdAt: '2026-02-26T00:00:00.000Z',
      },
      messageWithMetadata({
        id: 2,
        content: 'Query executed successfully, returned 8 rows',
        metadata: {
          kind: 'query-result',
          rowCount: 8,
          summary: '8 orders found',
        },
      }),
      {
        id: 3,
        conversationId: 10,
        role: 'system',
        content: 'cleanup',
        metadata: undefined,
        createdAt: '2026-02-26T00:00:00.000Z',
      },
    ];

    const turns = extractQueryTurns(messages);
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      index: 1,
      rowCount: 8,
      metadata: {
        summary: '8 orders found',
      },
    });
  });

  it('extractQueryTurns should normalize empty-result metadata to rowCount 0', () => {
    const turns = extractQueryTurns([
      {
        id: 1,
        conversationId: 10,
        role: 'user',
        content: 'count users',
        metadata: undefined,
        createdAt: '2026-02-26T00:00:00.000Z',
      },
      messageWithMetadata({
        id: 2,
        content: 'found none',
        metadata: {
          kind: 'query-result',
          hasResult: false,
          summary: 'No rows',
        },
      }),
    ]);

    expect(turns).toHaveLength(1);
    expect(turns[0].rowCount).toBe(0);
    expect(turns[0].metadata?.summary).toBe('No rows');
  });

  it('getRerunContextFromMetadata should cap limit to QUERY_REQUEST_LIMIT_MAX', () => {
    const context = getRerunContextFromMetadata({
      schemaVersion: 1,
      kind: 'query-result',
      limit: QUERY_REQUEST_LIMIT_MAX + 100,
      datasourceId: 1,
    });

    expect(context.limit).toBe(QUERY_REQUEST_LIMIT_MAX);
    expect(context.datasourceId).toBe(1);
  });
});
