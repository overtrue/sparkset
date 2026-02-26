import { describe, expect, it } from 'vitest';
import {
  buildQueryErrorResponse,
  normalizeQueryErrorCode,
  parseRateLimitRetryAfter,
  QUERY_ERROR_CODES,
  CONVERSATION_MESSAGE_METADATA_VERSION,
  CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
} from './protocol';
import {
  buildConversationMessageMetadata,
  getConversationMessageRowCount,
  parseConversationMessageMetadata,
  parseLegacyResultRowCountFromMessageContent,
} from './conversation-message-metadata';

describe('query protocol', () => {
  describe('conversation message metadata constants', () => {
    it('exports protocol metadata version and kind', () => {
      expect(typeof CONVERSATION_MESSAGE_METADATA_VERSION).toBe('number');
      expect(CONVERSATION_MESSAGE_METADATA_VERSION).toBeGreaterThan(0);
      expect(CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT).toBe('query-result');
      expect(CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT.startsWith('query-')).toBe(true);
    });
  });

  describe('normalizeQueryErrorCode', () => {
    it('maps canonical error code', () => {
      expect(normalizeQueryErrorCode('VALIDATION_ERROR')).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
      expect(normalizeQueryErrorCode('validation_error')).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
      expect(normalizeQueryErrorCode(' validation_error ')).toBe(
        QUERY_ERROR_CODES.VALIDATION_ERROR,
      );
    });

    it('maps legacy error code', () => {
      expect(normalizeQueryErrorCode('E_RATE_LIMIT_EXCEEDED')).toBe(QUERY_ERROR_CODES.RATE_LIMIT);
      expect(normalizeQueryErrorCode('E_DATABASE_ERROR')).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
    });

    it('returns undefined for unknown code', () => {
      expect(normalizeQueryErrorCode('something_unknown')).toBeUndefined();
    });
  });

  describe('parseRateLimitRetryAfter', () => {
    it('parses seconds from chinese message', () => {
      expect(parseRateLimitRetryAfter('请等待 2 分钟后重试')).toBe(120);
    });

    it('returns fallback when no timeout found', () => {
      expect(parseRateLimitRetryAfter('rate limit reached', 7)).toBe(7);
    });

    it('parses bare seconds from mixed message without unit', () => {
      expect(parseRateLimitRetryAfter('please retry in 30')).toBe(30);
    });
  });

  describe('buildQueryErrorResponse', () => {
    it('normalizes legacy validation code to validation error envelope', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'Some invalid input',
        errorCode: 'E_VALIDATION_ERROR',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    });

    it('maps rate limit hints with retry-after when status is 429', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'Please retry later',
        errorStatus: 429,
        retryAfter: 30,
      });

      expect(envelope.status).toBe(429);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.RATE_LIMIT);
      expect(envelope.payload.retryAfter).toBe(30);
    });

    it('keeps database error code on schema-related message', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'Unknown column "order_id"',
        errorCode: 'E_EXTERNAL_SERVICE_ERROR',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
      expect(envelope.payload.message).toContain('Unknown column');
    });

    it('maps schema sync missing message to configuration error', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'No tables found in datasource. Please sync the datasource schema first.',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.CONFIGURATION_ERROR);
      expect(envelope.payload.message).toBe(
        'No tables found in datasource. Please sync the datasource schema first.',
      );
    });

    it('falls back message-driven configuration mapping when status is 0', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'No schema synced yet. Please configure datasource first.',
        errorStatus: 0,
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.CONFIGURATION_ERROR);
    });

    it('falls back unknown/invalid status to internal code for non-matching messages', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'Something happened unexpectedly',
        errorStatus: -1,
      });

      expect(envelope.status).toBe(500);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
    });

    it('falls back unknown status to matching protocol code', () => {
      const unauthorized = buildQueryErrorResponse({
        errorMessage: 'token expired',
        errorStatus: 401,
      });
      expect(unauthorized.status).toBe(401);
      expect(unauthorized.payload.code).toBe(QUERY_ERROR_CODES.UNAUTHENTICATED);

      const forbidden = buildQueryErrorResponse({
        errorMessage: 'access denied',
        errorStatus: 403,
      });
      expect(forbidden.status).toBe(403);
      expect(forbidden.payload.code).toBe(QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN);
    });

    it('maps localized authentication message to unauthenticated when status is missing', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: '请重新登录后重试',
      });

      expect(envelope.status).toBe(401);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.UNAUTHENTICATED);
    });

    it('maps token-not-found SQL message as database error', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'Unknown column `token_id` in `sessions`',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
    });

    it('maps unknown 5xx code to internal error envelope', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'service unavailable',
        errorStatus: 502,
      });

      expect(envelope.status).toBe(500);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
    });

    it('accepts status-like string values', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'too many requests',
        errorStatus: '429' as const,
      });

      expect(envelope.status).toBe(429);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.RATE_LIMIT);
    });

    it('keeps validation code for generic conversationId validation messages', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'conversationId must be a positive integer',
        errorStatus: 400,
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    });

    it('maps database permission issues to database error', () => {
      const envelope = buildQueryErrorResponse({
        errorMessage: 'Access denied for user. Check credentials for datasource.',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
      expect(envelope.payload.message).toContain('Access denied for user');
    });
  });

  describe('conversation message metadata parsing', () => {
    it('parses v2 query-result metadata with nested result', () => {
      const parsed = parseConversationMessageMetadata({
        schemaVersion: 2,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT id FROM users',
        result: {
          sql: 'SELECT id FROM users',
          rows: [{ id: 1 }, { id: 2 }],
          summary: 'matched users',
        },
      });

      expect(parsed).toMatchObject({
        schemaVersion: 2,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT id FROM users',
        rowCount: 2,
        summary: 'matched users',
        hasResult: true,
      });
      expect(parsed?.result?.rows).toHaveLength(2);
    });

    it('parses legacy metadata with top-level rowCount and no explicit kind', () => {
      const parsed = parseConversationMessageMetadata({
        version: 1,
        sql: 'SELECT id FROM users',
        rowCount: '3',
        hasResult: 'false',
      });

      expect(parsed).toMatchObject({
        schemaVersion: 1,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        rowCount: 3,
        hasResult: false,
      });
      expect(parsed?.sql).toBe('SELECT id FROM users');
    });

    it('defaults schemaVersion when metadata version is missing', () => {
      const parsed = parseConversationMessageMetadata({
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT id FROM users',
        result: {
          sql: 'SELECT id FROM users',
          rows: [],
        },
      });
      expect(parsed?.schemaVersion).toBe(CONVERSATION_MESSAGE_METADATA_VERSION);
      expect(parsed?.rowCount).toBe(0);
      expect(parsed?.hasResult).toBe(false);
    });

    it('accepts metadataVersion alias', () => {
      const parsed = parseConversationMessageMetadata({
        metadataVersion: 1,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT id FROM users',
      });
      expect(parsed?.schemaVersion).toBe(1);
    });

    it('supports legacy rowCount string zero', () => {
      const parsed = parseConversationMessageMetadata({
        version: 1,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        rowCount: '0',
        hasResult: false,
      });

      expect(parsed?.rowCount).toBe(0);
      expect(parsed?.hasResult).toBe(false);
    });

    it('extracts fallback row count from assistant message content', () => {
      expect(
        parseLegacyResultRowCountFromMessageContent(
          'Query executed successfully, returned 8 rows.',
        ),
      ).toBe(8);
      const parsed = getConversationMessageRowCount(
        { kind: 'query-result', rowCount: 0 },
        'returned 8 rows',
      );
      expect(parsed).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('执行查询后，未查询到匹配结果。')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('未查询到任何结果')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('No records found')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent("didn't return any rows")).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('didn’t return any rows')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('did not return any rows')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('No data found')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('No results found')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('Found 0 rows')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('Found 7 rows')).toBe(7);
      expect(parseLegacyResultRowCountFromMessageContent('Found 5 records')).toBe(5);
      expect(
        getConversationMessageRowCount({ kind: 'query-result', result: {} }, '没有查询到结果'),
      ).toBe(0);
      expect(getConversationMessageRowCount({ kind: 'query-result' }, '查询结果为空。')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('returned 0 rows')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('3 rows returned')).toBe(3);
      expect(parseLegacyResultRowCountFromMessageContent('2 records found')).toBe(2);
      expect(parseLegacyResultRowCountFromMessageContent('no matching rows found')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('returned 0 records')).toBe(0);
      expect(parseLegacyResultRowCountFromMessageContent('No data returned.')).toBe(0);
      expect(
        parseLegacyResultRowCountFromMessageContent(
          'Query executed successfully, returned 1,234 rows',
        ),
      ).toBe(1234);
      expect(parseLegacyResultRowCountFromMessageContent('Found 12,345 records')).toBe(12345);
    });

    it('returns 0 when hasResult is explicitly false but rowCount is missing', () => {
      const parsed = getConversationMessageRowCount(
        { kind: 'query-result', hasResult: false },
        'no rows',
      );
      expect(parsed).toBe(0);
    });

    it('falls back to assistant content when metadata shape is not query-result', () => {
      expect(getConversationMessageRowCount({ kind: 'system-note' }, 'No data returned')).toBe(0);
      expect(
        getConversationMessageRowCount(
          { random: 'value' },
          'Query executed successfully, returned 12 rows',
        ),
      ).toBe(12);
    });

    it('returns null when neither metadata nor content can provide row count', () => {
      expect(
        getConversationMessageRowCount({}, 'The operation completed successfully.'),
      ).toBeNull();
      expect(
        getConversationMessageRowCount(null, 'The operation completed successfully.'),
      ).toBeNull();
    });

    it('returns null when metadata kind is not recognized', () => {
      const parsed = parseConversationMessageMetadata({
        kind: 'system-note',
        rowCount: 3,
      });
      expect(parsed).toBeNull();
    });

    it('supports legacy result payload as raw rows array', () => {
      const parsed = parseConversationMessageMetadata({
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        result: [{ id: 1 }, { id: 2 }],
      });

      expect(parsed).not.toBeNull();
      expect(parsed).toMatchObject({
        rowCount: 2,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: undefined,
      });
      expect(parsed?.result?.rows).toHaveLength(2);
    });
  });

  describe('conversation message metadata builder', () => {
    it('builds query-result metadata for empty result set', () => {
      const metadata = buildConversationMessageMetadata(
        {},
        {
          sql: 'SELECT * FROM users WHERE id = -1',
          rows: [],
          summary: 'no records',
        },
      );

      expect(metadata).toMatchObject({
        rowCount: 0,
        hasResult: false,
        summary: 'no records',
      });
      expect(metadata.result).toMatchObject({
        rowCount: 0,
        hasResult: false,
        summary: 'no records',
      });
      expect(metadata.result.rows).toHaveLength(0);
    });

    it('builds query-result metadata consistently', () => {
      const metadata = buildConversationMessageMetadata(
        {
          datasource: 11,
          aiProvider: 22,
          limit: 100,
        },
        {
          sql: 'SELECT * FROM orders LIMIT 10',
          rows: [{ id: 1 }, { id: 2 }, { id: 3 }],
          summary: 'top 3',
        },
      );

      expect(metadata).toMatchObject({
        schemaVersion: CONVERSATION_MESSAGE_METADATA_VERSION,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT * FROM orders LIMIT 10',
        rowCount: 3,
        summary: 'top 3',
        hasResult: true,
        datasourceId: 11,
        aiProviderId: 22,
        limit: 100,
      });
      expect(metadata.result).toMatchObject({
        rowCount: 3,
        hasResult: true,
        datasourceId: 11,
        aiProviderId: 22,
        limit: 100,
      });
    });
  });
});
