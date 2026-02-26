import { describe, expect, it } from 'vitest';
import { ApiError } from './fetch';
import { parseQueryError, getQueryErrorAction } from './query-errors';
import { normalizeQueryRequest } from './query';
import {
  QUERY_ERROR_CODES,
  QUERY_ERROR_HTTP_STATUS,
  QUERY_ERROR_MESSAGES,
  QUERY_REQUEST_QUESTION_MAX_LENGTH,
} from '@sparkset/core';

const t = (key: string, values?: Record<string, string | number>) =>
  values ? key.replace(/\{(\w+)\}/g, (_, keyName) => String(values[keyName])) : key;

describe('normalizeQueryRequest', () => {
  it('should normalize valid query request and trim question', () => {
    const result = normalizeQueryRequest({
      question: '  查询订单总数  ',
      datasource: 2,
      limit: 20,
      aiProvider: 3,
      conversationId: 1,
    });

    expect(result).toEqual({
      question: '查询订单总数',
      datasource: 2,
      aiProvider: 3,
      limit: 20,
      conversationId: 1,
    });
  });

  it('should reject missing or over-limit question', () => {
    expect(() => normalizeQueryRequest({ question: '   ', datasource: 1 })).toThrow(
      'question is required',
    );
    expect(() =>
      normalizeQueryRequest({
        question: 'a'.repeat(QUERY_REQUEST_QUESTION_MAX_LENGTH + 1),
        datasource: 1,
      }),
    ).toThrow(`question must not exceed ${QUERY_REQUEST_QUESTION_MAX_LENGTH} characters`);
  });
});

describe('parseQueryError', () => {
  it('should parse api error details and sql from database error payload', () => {
    const apiError = new ApiError(
      'bad query',
      400,
      {
        code: QUERY_ERROR_CODES.DATABASE_ERROR,
        message: 'Database error. SQL: SELECT * FROM t; Syntax Error',
        details: ['question: question is required'],
      },
      QUERY_ERROR_CODES.DATABASE_ERROR,
    );

    const parsed = parseQueryError(apiError, 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
    expect(parsed.sql).toBe('SELECT * FROM t');
    expect(parsed.details).toEqual(['Question: Question is required']);
  });

  it('should map validation messages to action-friendly localized fields', () => {
    const validationError = new ApiError(
      'validation failed',
      400,
      {
        code: QUERY_ERROR_CODES.VALIDATION_ERROR,
        message:
          'Request validation failed. Please check your question, datasource, and AI provider settings.',
        details: [
          'conversationId: conversationId must be a positive integer',
          'limit: limit must be less than or equal to 1000',
        ],
      },
      QUERY_ERROR_CODES.VALIDATION_ERROR,
    );

    const parsed = parseQueryError(validationError, 'fallback', t);
    expect(parsed.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(parsed.details).toEqual([
      'Conversation ID: Conversation ID must be a positive integer',
      'Limit: Limit must be at most 1000',
    ]);
  });

  it('should keep schema-sync hints in advice for configuration errors', () => {
    const configError = new ApiError(
      'failed',
      400,
      {
        code: QUERY_ERROR_CODES.CONFIGURATION_ERROR,
        message: 'No tables found in datasource. Please sync the datasource schema first.',
      },
      QUERY_ERROR_CODES.CONFIGURATION_ERROR,
    );

    const parsed = parseQueryError(configError, 'fallback', t);
    expect(parsed.code).toBe(QUERY_ERROR_CODES.CONFIGURATION_ERROR);
    expect(parsed.advice).toBe('No schema info, please sync the datasource first');
  });

  it('should create retry action for rate limit errors', () => {
    const rateLimitError = new ApiError(
      'too many requests',
      429,
      { code: QUERY_ERROR_CODES.RATE_LIMIT, retryAfter: 6 },
      QUERY_ERROR_CODES.RATE_LIMIT,
    );

    const parsed = parseQueryError(rateLimitError, 'fallback', t);
    const action = getQueryErrorAction(parsed, t, {
      push: () => undefined,
      onRetry: () => undefined,
      retryCountdown: 6,
    } as {
      push: (href: string) => void;
      onRetry: () => void;
      retryCountdown?: number;
    });

    expect(parsed.retryAfter).toBe(6);
    expect(action?.label).toBe('Retry in 6 seconds');
    expect(action?.disabled).toBe(true);
  });

  it('should handle non-string detail entries from api payload', () => {
    const validationError = new ApiError(
      'validation failed',
      400,
      {
        code: QUERY_ERROR_CODES.VALIDATION_ERROR,
        message: 'Validation error',
        details: [
          'conversationId: conversationId must be a positive integer',
          2,
          { message: 'limit: limit must be at least 1' },
          { meta: 'unexpected payload shape' },
        ],
      },
      QUERY_ERROR_CODES.VALIDATION_ERROR,
    );

    const parsed = parseQueryError(validationError, 'fallback', t);
    expect(parsed.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(parsed.details).toEqual([
      'Conversation ID: Conversation ID must be a positive integer',
      '2',
      'Limit: limit must be at least 1',
      '{"meta":"unexpected payload shape"}',
    ]);
  });

  it('should fallback unknown api code to status-based protocol code', () => {
    const unknownApiError = new ApiError(
      'service unavailable',
      500,
      { code: 'MYSTERY_ERROR' },
      'MYSTERY_ERROR',
    );

    const parsed = parseQueryError(unknownApiError, 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
    expect(parsed.status).toBe(500);
    expect(parsed.advice).toBe(t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.INTERNAL_ERROR]));
  });

  it('should map legacy unknown 400 errors to validation by status', () => {
    const unknownValidationApiError = new ApiError('invalid request payload', 400, {
      code: 'UNKNOWN_STATUS_CODE',
    });

    const parsed = parseQueryError(unknownValidationApiError, 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(parsed.status).toBe(400);
    expect(parsed.advice).toBe(t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.VALIDATION_ERROR]));
  });

  it('should infer api protocol code from message when status is missing', () => {
    const unknownStatusApiError = new ApiError('conversation not found', 0 as number, {
      code: 'MYSTERY_STATUSLESS',
    });

    const parsed = parseQueryError(unknownStatusApiError, 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND);
    expect(parsed.status).toBe(QUERY_ERROR_HTTP_STATUS[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]);
    expect(parsed.advice).toBe(t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]));
  });

  it('should infer unauthenticated code from localized message when status is missing', () => {
    const parsed = parseQueryError(new Error('请重新登录后重试'), 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.UNAUTHENTICATED);
    expect(parsed.status).toBe(QUERY_ERROR_HTTP_STATUS[QUERY_ERROR_CODES.UNAUTHENTICATED]);
    expect(parsed.advice).toBe(t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED]));
  });

  it('should infer config action for query page setup hints', () => {
    const parsed = parseQueryError(
      new ApiError(
        'failed',
        400,
        {
          code: QUERY_ERROR_CODES.CONFIGURATION_ERROR,
          message: 'Please configure an AI Provider before querying.',
        },
        QUERY_ERROR_CODES.CONFIGURATION_ERROR,
      ),
      'fallback',
      t,
    );

    const action = getQueryErrorAction(parsed, t, {
      push: () => undefined,
      onNewConversation: () => undefined,
    } as {
      push: (href: string) => void;
      onNewConversation?: () => void;
    });

    expect(action?.label).toBe('Configure AI Provider');
  });
});

describe('parseQueryError (non-api)', () => {
  it('should normalize local validation errors from thrown validation errors', () => {
    const parsed = parseQueryError(new Error('question is required'), 'fallback', t);
    expect(parsed.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(parsed.status).toBe(400);
    expect(parsed.message).toBe('Question is required');
  });

  it('should infer protocol codes from non-api fallback messages', () => {
    const parsed = parseQueryError(
      new Error('Conversation not found, please start a new conversation to continue.'),
      'fallback',
      t,
    );

    expect(parsed.code).toBe(QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND);
    expect(parsed.status).toBe(404);
    expect(parsed.advice).toBe(t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]));
  });

  it('should provide friendly message for network failure errors', () => {
    const parsed = parseQueryError(new Error('Failed to fetch'), 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
    expect(parsed.status).toBe(500);
    expect(parsed.message).toBe(t('Network request failed. Please check your connection'));
    expect(parsed.advice).toBe(
      t('A server error occurred while executing query. Please retry later.'),
    );
  });

  it('should default unknown local errors to internal error protocol', () => {
    const parsed = parseQueryError(new Error('unexpected runtime issue'), 'fallback', t);

    expect(parsed.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
    expect(parsed.status).toBe(500);
    expect(parsed.advice).toBe(t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.INTERNAL_ERROR]));
  });
});

describe('getQueryErrorAction', () => {
  it('should not return a retry action when retry callback is missing', () => {
    const action = getQueryErrorAction(
      {
        message: 'Too many requests',
        status: 429,
        code: QUERY_ERROR_CODES.RATE_LIMIT,
        advice: 'Please wait before retrying.',
      },
      t,
      {
        push: () => undefined,
      },
    );

    expect(action).toBeNull();
  });
});
