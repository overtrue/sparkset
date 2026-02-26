import {
  type QueryErrorEnvelope,
  buildQueryErrorResponse,
  QUERY_ERROR_CODES,
  QUERY_ERROR_MESSAGES,
} from '@sparkset/core';

interface Issue {
  path?: (string | number)[];
  message?: string;
}

export interface QueryErrorResponseInput {
  errorMessage: string;
  errorCode?: string;
  errorStatus?: number | string;
  details?: string[];
  retryAfter?: number;
}

export const buildQueryErrorResponsePayload = (
  input: QueryErrorResponseInput,
): QueryErrorEnvelope => {
  return buildQueryErrorResponse({
    errorMessage: input.errorMessage,
    errorCode: input.errorCode,
    errorStatus: input.errorStatus,
    ...(input.details ? { details: input.details } : {}),
    ...(input.retryAfter !== undefined && input.retryAfter !== null
      ? { retryAfter: input.retryAfter }
      : {}),
  });
};

export const buildQueryValidationErrorResponse = (details?: string[]): QueryErrorEnvelope => {
  return buildQueryErrorResponsePayload({
    errorMessage: QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.VALIDATION_ERROR],
    errorCode: QUERY_ERROR_CODES.VALIDATION_ERROR,
    errorStatus: 400,
    ...(details ? { details } : {}),
  });
};

export const isZodError = (error: unknown): error is { issues?: Issue[] } => {
  return (
    error instanceof Error && 'name' in error && (error as { name?: string }).name === 'ZodError'
  );
};

export const extractValidationIssues = (error: unknown): string[] | undefined => {
  if (!isZodError(error) || !Array.isArray(error.issues)) {
    return undefined;
  }

  return error.issues
    .map((item) => {
      const path = (item?.path ?? [])
        .filter(
          (segment): segment is string | number =>
            segment !== undefined && segment !== null && segment !== '',
        )
        .join('.');
      return path ? `${path}: ${item.message ?? ''}` : item.message;
    })
    .filter((item): item is string => !!item);
};

export const extractErrorDetails = (error: unknown): string[] | undefined => {
  if (!error || typeof error !== 'object' || !('details' in error)) {
    return undefined;
  }

  const details = (error as { details?: unknown[] }).details;
  if (!Array.isArray(details)) {
    return undefined;
  }

  const normalized = details
    .map((item): string | undefined => {
      if (typeof item === 'string') {
        return item;
      }

      if (
        item !== null &&
        typeof item === 'object' &&
        'message' in item &&
        typeof (item as { message?: unknown }).message === 'string'
      ) {
        return (item as { message: string }).message;
      }

      if (typeof item === 'number' || typeof item === 'boolean' || item === null) {
        return String(item);
      }

      try {
        return JSON.stringify(item);
      } catch {
        return undefined;
      }
    })
    .filter((item): item is string => typeof item === 'string');

  return normalized.length > 0 ? normalized : undefined;
};

export const extractErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  const rawCode = (error as { code?: unknown }).code;
  if (typeof rawCode === 'string' || typeof rawCode === 'number') {
    const trimmed = String(rawCode).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
};

export const extractErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const rawStatus = (error as { status?: unknown }).status;
  if (typeof rawStatus !== 'number' && typeof rawStatus !== 'string') {
    return undefined;
  }

  const status = Number(rawStatus);
  return Number.isFinite(status) && status > 0 ? status : undefined;
};

export const extractErrorRetryAfter = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('retryAfter' in error)) {
    return undefined;
  }

  const rawRetryAfter = (error as { retryAfter?: unknown }).retryAfter;
  const retryAfter =
    typeof rawRetryAfter === 'string' ? Number(rawRetryAfter) : Number(rawRetryAfter);

  if (!Number.isFinite(retryAfter) || retryAfter <= 0) {
    return undefined;
  }

  return Math.min(120, Math.max(1, Math.floor(retryAfter)));
};

export const buildInternalQueryErrorResponse = (error: unknown): QueryErrorEnvelope => {
  const errorText =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'An unexpected error occurred';

  const message = errorText.trim() ? errorText : 'An unexpected error occurred';
  const envelope = buildQueryErrorResponsePayload({
    errorMessage: message,
    errorCode: extractErrorCode(error),
    errorStatus: extractErrorStatus(error),
    details: extractErrorDetails(error),
    retryAfter: extractErrorRetryAfter(error),
  });

  if (
    envelope.payload.code === QUERY_ERROR_CODES.INTERNAL_ERROR &&
    message === 'An unexpected error occurred'
  ) {
    return {
      ...envelope,
      payload: {
        ...envelope.payload,
        message: 'An unexpected error occurred',
      },
    };
  }

  return envelope;
};
