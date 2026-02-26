export const QUERY_ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  CONVERSATION_FORBIDDEN: 'CONVERSATION_FORBIDDEN',
  RATE_LIMIT: 'RATE_LIMIT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const QUERY_REQUEST_LIMIT_MAX = 1000;
export const QUERY_REQUEST_QUESTION_MAX_LENGTH = 2000;
export const CONVERSATION_MESSAGE_METADATA_VERSION = 2;
export const CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT = 'query-result' as const;
export type ConversationMessageMetadataKind =
  typeof CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT;

export type QueryErrorCode = (typeof QUERY_ERROR_CODES)[keyof typeof QUERY_ERROR_CODES];

export const LEGACY_QUERY_ERROR_CODES = {
  E_RATE_LIMIT_EXCEEDED: QUERY_ERROR_CODES.RATE_LIMIT,
  E_VALIDATION_ERROR: QUERY_ERROR_CODES.VALIDATION_ERROR,
  E_BUSINESS_ERROR: QUERY_ERROR_CODES.VALIDATION_ERROR,
  E_DATABASE_ERROR: QUERY_ERROR_CODES.DATABASE_ERROR,
  E_CONFIGURATION_ERROR: QUERY_ERROR_CODES.CONFIGURATION_ERROR,
  E_INTERNAL_ERROR: QUERY_ERROR_CODES.INTERNAL_ERROR,
  E_AUTHENTICATION_FAILED: QUERY_ERROR_CODES.UNAUTHENTICATED,
  E_AUTHORIZATION_FAILED: QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN,
  E_NOT_FOUND: QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND,
  E_EXTERNAL_SERVICE_ERROR: QUERY_ERROR_CODES.INTERNAL_ERROR,
} as const satisfies Record<string, QueryErrorCode>;

export type LegacyQueryErrorCode = keyof typeof LEGACY_QUERY_ERROR_CODES;

const QUERY_ERROR_CODE_SET = new Set(Object.values(QUERY_ERROR_CODES));

export const QUERY_ERROR_HTTP_STATUS: Record<QueryErrorCode, number> = {
  [QUERY_ERROR_CODES.UNAUTHENTICATED]: 401,
  [QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN]: 403,
  [QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]: 404,
  [QUERY_ERROR_CODES.RATE_LIMIT]: 429,
  [QUERY_ERROR_CODES.VALIDATION_ERROR]: 400,
  [QUERY_ERROR_CODES.DATABASE_ERROR]: 400,
  [QUERY_ERROR_CODES.CONFIGURATION_ERROR]: 400,
  [QUERY_ERROR_CODES.INTERNAL_ERROR]: 500,
} as const;

export interface QueryErrorEnvelope {
  status: number;
  payload: {
    error: string;
    code: QueryErrorCode;
    message: string;
    details?: string[];
    retryAfter?: number;
  };
}

export const QUERY_ERROR_TITLES: Record<QueryErrorCode, string> = {
  [QUERY_ERROR_CODES.UNAUTHENTICATED]: 'Authentication failed',
  [QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]: 'Not found',
  [QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN]: 'Forbidden',
  [QUERY_ERROR_CODES.RATE_LIMIT]: 'Rate limit exceeded',
  [QUERY_ERROR_CODES.VALIDATION_ERROR]: 'Validation error',
  [QUERY_ERROR_CODES.DATABASE_ERROR]: 'Database error',
  [QUERY_ERROR_CODES.CONFIGURATION_ERROR]: 'Configuration error',
  [QUERY_ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
} as const;

export const QUERY_ERROR_MESSAGES: Record<QueryErrorCode, string> = {
  [QUERY_ERROR_CODES.UNAUTHENTICATED]: 'User not authenticated',
  [QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]:
    'Conversation not found, please start a new conversation to continue.',
  [QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN]: 'Conversation does not belong to the current user',
  [QUERY_ERROR_CODES.RATE_LIMIT]:
    'Query service is temporarily unavailable due to rate limit. Please try again in a while.',
  [QUERY_ERROR_CODES.VALIDATION_ERROR]:
    'Request validation failed. Please check your question, datasource, and AI provider settings.',
  [QUERY_ERROR_CODES.DATABASE_ERROR]:
    'Database error. Please ensure the datasource schema is synced and AI generated SQL only uses existing tables/columns.',
  [QUERY_ERROR_CODES.CONFIGURATION_ERROR]:
    'Please configure a datasource and AI provider before querying.',
  [QUERY_ERROR_CODES.INTERNAL_ERROR]:
    'A server error occurred while executing query. Please retry later.',
} as const;

export const DEFAULT_RATE_LIMIT_SECONDS = 10;

export function normalizeQueryErrorCode(rawCode: unknown): QueryErrorCode | undefined {
  if (typeof rawCode !== 'string') {
    return undefined;
  }

  const normalized = rawCode.trim().toUpperCase();
  if (!normalized) {
    return undefined;
  }

  if (QUERY_ERROR_CODE_SET.has(normalized as QueryErrorCode)) {
    return normalized as QueryErrorCode;
  }

  return LEGACY_QUERY_ERROR_CODES[normalized as LegacyQueryErrorCode];
}

export function parseRateLimitRetryAfter(
  errorMessage: string,
  fallback = DEFAULT_RATE_LIMIT_SECONDS,
): number {
  if (!errorMessage) {
    return fallback;
  }

  let match = errorMessage.match(
    /(?:retry|wait|after|in|wait\s*after|之后|请)\s+(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|秒|分钟|min)?/i,
  );

  if (!match) {
    match = errorMessage.match(
      /请[\u4e00-\u9fff\s]{0,12}(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|秒|分钟|min)?/i,
    );
  }

  if (!match?.[1]) {
    return fallback;
  }

  const rawSeconds = Number(match[1]);
  if (!Number.isFinite(rawSeconds) || rawSeconds <= 0) {
    return fallback;
  }

  if (match[2] && /(minutes?|mins?|m|分钟|min)/i.test(match[2])) {
    return Math.min(120, Math.max(1, Math.floor(rawSeconds * 60)));
  }

  return Math.min(120, Math.max(1, Math.floor(rawSeconds)));
}

const isRateLimitMessage = (message: string): boolean =>
  /rate\s*limit|too\s*many\s*requests|retry\s+after|retry\s+in|429|限流|频率|超限/i.test(message);

const isDatabaseMessage = (message: string): boolean =>
  /table.*does not exist|unknown column|table.*not found|unknown database|sql syntax|数据库|不存在|不合法|doesn't exist|not exist|syntax error|access denied|denied/i.test(
    message,
  );

const isAuthenticationMessage = (message: string): boolean =>
  /not authenticated|authentication failed|authentication token|access token|token expired|expired token|invalid token|please log(in|in again)|please re.?login|login required|请重新登录|未登录|未认证|未授权/i.test(
    message,
  );

const isConfigurationMessage = (message: string): boolean =>
  /no datasource|selected datasource|no ai provider|selected ai provider|datasource.*not found|provider.*not found|no schema|schema.*not synced|no tables found|未配置|未设置|无可用|未同步|未同步到|暂无表|表结构|未找到表/i.test(
    message,
  );

export interface QueryErrorInput {
  errorMessage: string;
  errorCode?: string;
  errorStatus?: number | string;
  details?: string[];
  retryAfter?: number;
}

export function buildQueryErrorResponse(input: QueryErrorInput): QueryErrorEnvelope {
  const normalizedMessage = (input.errorMessage || '').trim();
  const normalizedCode = normalizeQueryErrorCode(input.errorCode);
  const status = Number.isFinite(Number(input.errorStatus)) ? Number(input.errorStatus) : undefined;

  const payloadCode =
    status === 429 || isRateLimitMessage(normalizedMessage)
      ? QUERY_ERROR_CODES.RATE_LIMIT
      : normalizedCode;

  const payload = (code: QueryErrorCode, messageOverride?: string): QueryErrorEnvelope => {
    const retryAfter =
      code === QUERY_ERROR_CODES.RATE_LIMIT
        ? (input.retryAfter ??
          (normalizedMessage ? parseRateLimitRetryAfter(normalizedMessage) : undefined))
        : undefined;

    return {
      status: QUERY_ERROR_HTTP_STATUS[code],
      payload: {
        error: QUERY_ERROR_TITLES[code],
        code,
        message: messageOverride ?? QUERY_ERROR_MESSAGES[code],
        ...(input.details && input.details.length ? { details: input.details } : {}),
        ...(retryAfter ? { retryAfter } : {}),
      },
    };
  };

  if (
    payloadCode === QUERY_ERROR_CODES.RATE_LIMIT ||
    normalizedCode === QUERY_ERROR_CODES.RATE_LIMIT
  ) {
    return payload(
      QUERY_ERROR_CODES.RATE_LIMIT,
      QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.RATE_LIMIT],
    );
  }

  if (
    payloadCode === QUERY_ERROR_CODES.UNAUTHENTICATED ||
    status === 401 ||
    isAuthenticationMessage(normalizedMessage)
  ) {
    return payload(
      QUERY_ERROR_CODES.UNAUTHENTICATED,
      normalizedMessage || QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED],
    );
  }

  if (payloadCode === QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN || status === 403) {
    return payload(
      QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN,
      normalizedMessage || QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN],
    );
  }

  if (
    payloadCode === QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND ||
    status === 404 ||
    /conversation.*not found|not\s+found.*conversation/i.test(normalizedMessage)
  ) {
    return payload(
      QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND,
      normalizedMessage || QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND],
    );
  }

  if (payloadCode === QUERY_ERROR_CODES.DATABASE_ERROR || isDatabaseMessage(normalizedMessage)) {
    const databaseMessage = normalizedMessage
      ? normalizedMessage.includes(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.DATABASE_ERROR])
        ? normalizedMessage
        : `${normalizedMessage}. ${QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.DATABASE_ERROR]}`
      : QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.DATABASE_ERROR];
    return payload(QUERY_ERROR_CODES.DATABASE_ERROR, databaseMessage);
  }

  if (
    payloadCode === QUERY_ERROR_CODES.CONFIGURATION_ERROR ||
    isConfigurationMessage(normalizedMessage)
  ) {
    return payload(
      QUERY_ERROR_CODES.CONFIGURATION_ERROR,
      normalizedMessage || QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONFIGURATION_ERROR],
    );
  }

  if (payloadCode === QUERY_ERROR_CODES.VALIDATION_ERROR || status === 400) {
    return payload(QUERY_ERROR_CODES.VALIDATION_ERROR);
  }

  if (status && status >= 500) {
    return payload(QUERY_ERROR_CODES.INTERNAL_ERROR);
  }

  if (status && status >= 400) {
    return payload(QUERY_ERROR_CODES.VALIDATION_ERROR);
  }

  return payload(QUERY_ERROR_CODES.INTERNAL_ERROR);
}
