import { describe, expect, it } from 'vitest';
import { QUERY_ERROR_CODES } from '@sparkset/core';
import {
  buildInternalQueryErrorResponse,
  buildQueryErrorResponsePayload,
  buildQueryValidationErrorResponse,
  extractErrorCode,
  extractErrorStatus,
} from '../app/utils/query_error_response';

describe('query_error_response util', () => {
  describe('extractErrorStatus', () => {
    it('returns parsed positive number status', () => {
      expect(extractErrorStatus({ status: '429' })).toBe(429);
      expect(extractErrorStatus({ status: 500 })).toBe(500);
      expect(extractErrorStatus({ status: ' 500 ' })).toBe(500);
    });

    it('ignores non-positive status values', () => {
      expect(extractErrorStatus({ status: 0 })).toBeUndefined();
      expect(extractErrorStatus({ status: -1 })).toBeUndefined();
      expect(extractErrorStatus({ status: '0' })).toBeUndefined();
    });

    it('returns undefined for invalid status input', () => {
      expect(extractErrorStatus({ status: 'bad-status' })).toBeUndefined();
      expect(extractErrorStatus({ status: null })).toBeUndefined();
      expect(extractErrorStatus({})).toBeUndefined();
      expect(extractErrorStatus({ status: true })).toBeUndefined();
    });
  });

  describe('extractErrorCode', () => {
    it('normalizes whitespace wrapped codes', () => {
      expect(extractErrorCode({ code: ' E_VALIDATION_ERROR ' })).toBe('E_VALIDATION_ERROR');
    });

    it('returns undefined for blank code string', () => {
      expect(extractErrorCode({ code: '   ' })).toBeUndefined();
    });
  });

  describe('buildQueryErrorResponsePayload', () => {
    it('builds validation envelope with request status and details', () => {
      const envelope = buildQueryValidationErrorResponse(['question is required']);
      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
      expect(envelope.payload.details).toEqual(['question is required']);
    });

    it('preserves payload details and retry-after', () => {
      const envelope = buildQueryErrorResponsePayload({
        errorMessage: 'Please retry in 2 minutes',
        errorStatus: 429,
        retryAfter: 120,
        details: ['limited quota'],
      });

      expect(envelope.status).toBe(429);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.RATE_LIMIT);
      expect(envelope.payload.retryAfter).toBe(120);
      expect(envelope.payload.details).toEqual(['limited quota']);
    });

    it('accepts string status values for payload building', () => {
      const envelope = buildQueryErrorResponsePayload({
        errorMessage: 'Please retry in 2 minutes',
        errorStatus: '429',
        details: ['rate limited'],
      });

      expect(envelope.status).toBe(429);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.RATE_LIMIT);
      expect(envelope.payload.details).toEqual(['rate limited']);
    });
  });

  describe('buildInternalQueryErrorResponse', () => {
    it('maps code-based errors from wrapped error object', () => {
      const envelope = buildInternalQueryErrorResponse({
        code: 'E_VALIDATION_ERROR',
        message: 'Invalid question format',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    });

    it('normalizes code with whitespace when building internal error response', () => {
      const envelope = buildInternalQueryErrorResponse({
        code: ' E_DATABASE_ERROR ',
        message: 'Unknown column',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
    });

    it('ignores invalid status and keeps message-driven mapping', () => {
      const envelope = buildInternalQueryErrorResponse({
        status: 0,
        message: 'No tables found in datasource. Please sync the datasource schema first.',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.CONFIGURATION_ERROR);
      expect(envelope.payload.message).toContain('No tables found');
    });

    it('defaults to internal error for truly unknown errors', () => {
      const envelope = buildInternalQueryErrorResponse(new Error('unexpected parsing issue'));

      expect(envelope.status).toBe(500);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
    });

    it('normalizes object detail entries into readable strings', () => {
      const envelope = buildInternalQueryErrorResponse({
        message: 'Configuration validation failed',
        details: [{ message: 'datasource invalid' }, 42],
        code: 'E_CONFIGURATION_ERROR',
      });

      expect(envelope.status).toBe(400);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.CONFIGURATION_ERROR);
      expect(envelope.payload.details).toEqual(['datasource invalid', '42']);
    });

    it('keeps generic object payload as unexpected error for missing message', () => {
      const envelope = buildInternalQueryErrorResponse({ details: ['missing'] } as unknown);

      expect(envelope.status).toBe(500);
      expect(envelope.payload.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
      expect(envelope.payload.message).toBe('An unexpected error occurred');
      expect(envelope.payload.details).toEqual(['missing']);
    });
  });
});
