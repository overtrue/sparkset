import {
  QUERY_ERROR_MESSAGES,
  QUERY_ERROR_CODES,
  QUERY_ERROR_HTTP_STATUS,
  normalizeQueryErrorCode,
  type QueryErrorCode,
} from '@sparkset/core';
import { ApiError } from '@/lib/fetch';

interface ApiErrorPayloadLike {
  message?: unknown;
  details?: unknown[];
  retryAfter?: unknown;
  code?: unknown;
}

const SQL_ERROR_PATTERNS = [
  /SQL:\s*(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(?=\s*(?:--|;|$))/i,
  /^(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(?=\s*-\s*|$)/i,
];

export type QueryTranslation = (key: string, values?: Record<string, string | number>) => string;

export interface QueryError {
  message: string;
  status?: number;
  code?: QueryErrorCode;
  sql?: string;
  advice?: string | null;
  details?: string[];
  retryAfter?: number;
}

export interface QueryErrorAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ErrorActionContext {
  push: (href: string) => void;
  onRetry?: () => void;
  onNewConversation?: () => void;
  retryCountdown?: number | null;
  isSubmitting?: boolean;
}

const getErrorAdvice = (
  status?: number,
  code?: QueryErrorCode,
  message?: string,
  t?: QueryTranslation,
): string | null => {
  if (!t) {
    return null;
  }

  if (code && code in QUERY_ERROR_MESSAGES) {
    const defaultAdvice = t(QUERY_ERROR_MESSAGES[code]);
    const lowerMessage = message ? message.toLowerCase() : '';

    if (code === QUERY_ERROR_CODES.CONFIGURATION_ERROR && message) {
      if (/schema|no tables|no schema|未同步|暂无表|表结构|未找到表/i.test(lowerMessage)) {
        return t('No schema info, please sync the datasource first');
      }

      if (
        /datasource|selected datasource|no datasource/.test(lowerMessage) ||
        /data source|data-source/.test(lowerMessage)
      ) {
        return t('Please configure a datasource before querying');
      }

      if (
        /provider|ai provider|no ai provider|selected ai provider/.test(lowerMessage) ||
        /no ai provider/.test(lowerMessage)
      ) {
        return t('Please configure an AI Provider before using AI query');
      }
    }

    return defaultAdvice;
  }

  if (status === 429) {
    return t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.RATE_LIMIT]);
  }

  if (status === 401) {
    return t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.UNAUTHENTICATED]);
  }

  if (status === 403) {
    return t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN]);
  }

  if (status === 404) {
    return t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND]);
  }

  if (status >= 500) {
    return t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.INTERNAL_ERROR]);
  }

  if (status === 400) {
    return t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.VALIDATION_ERROR]);
  }

  return null;
};

const inferQueryErrorCode = (message: string): QueryErrorCode | undefined => {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    return undefined;
  }

  const lower = normalizedMessage.toLowerCase();

  if (
    /^question is required$/i.test(lower) ||
    lower.startsWith('question must not exceed') ||
    lower.includes('must be a positive integer') ||
    lower.includes('must be less than or equal to') ||
    lower.includes('question is required') ||
    lower.includes('question must')
  ) {
    return QUERY_ERROR_CODES.VALIDATION_ERROR;
  }

  if (/rate\s*limit|too many requests|retry\s+(after|in)|429/i.test(lower)) {
    return QUERY_ERROR_CODES.RATE_LIMIT;
  }

  if (
    /conversation.*not found|not\s+found.*conversation/i.test(lower) ||
    /no conversation/i.test(lower)
  ) {
    return QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND;
  }

  if (/not authorized|forbidden|禁止|无权限|belongs to current user|未属于/i.test(lower)) {
    return QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN;
  }

  if (
    /user not authenticated|please re-login|未认证|未登录|authentication failed|not authenticated|请重新登录|未授权|登录已过期|登录过期|token expired|expired token/i.test(
      lower,
    )
  ) {
    return QUERY_ERROR_CODES.UNAUTHENTICATED;
  }

  if (
    /no schema|schema.*not synced|no tables found|please sync|无 schema|未同步|暂无表|表结构|未找到表|未配置|no datasource|no ai provider|no datasource|selected datasource|selected ai provider/i.test(
      lower,
    )
  ) {
    return QUERY_ERROR_CODES.CONFIGURATION_ERROR;
  }

  if (
    /table.*(does not exist|不存在)|unknown column|sql syntax|doesn't exist|不合法|not exist|syntax error/i.test(
      lower,
    )
  ) {
    return QUERY_ERROR_CODES.DATABASE_ERROR;
  }

  return undefined;
};

const parseValidationField = (field: string, t: QueryTranslation): string => {
  const rawField = field.trim();
  const normalizedField = rawField.split('.').pop()?.trim() ?? rawField;
  const normalizedLower = normalizedField.toLowerCase();

  if (!normalizedField) {
    return field;
  }

  if (normalizedLower === 'question') {
    return t('Question');
  }

  if (
    normalizedLower === 'conversationid' ||
    normalizedLower === 'conversation_id' ||
    normalizedLower === 'conversation-id'
  ) {
    return t('Conversation ID');
  }

  if (
    normalizedLower === 'datasource' ||
    normalizedLower === 'datasourceid' ||
    normalizedLower === 'datasource_id' ||
    normalizedLower === 'datasource-id'
  ) {
    return t('Datasource ID');
  }

  if (
    normalizedLower === 'action' ||
    normalizedLower === 'actionid' ||
    normalizedLower === 'action_id' ||
    normalizedLower === 'action-id'
  ) {
    return t('Action ID');
  }

  if (
    normalizedLower === 'aiprovider' ||
    normalizedLower === 'ai_provider' ||
    normalizedLower === 'ai-provider'
  ) {
    return t('AI Provider ID');
  }

  if (normalizedLower === 'limit') {
    return t('Limit');
  }

  return normalizedField;
};

const localizeValidationMessage = (message: string, t: QueryTranslation): string | undefined => {
  const normalizedMessage = message.trim();

  if (!normalizedMessage) {
    return undefined;
  }

  if (normalizedMessage === 'question is required') {
    return t('Question is required');
  }

  const questionLengthMatch = normalizedMessage.match(
    /^question must not exceed (\d+) characters$/i,
  );
  if (questionLengthMatch?.[1]) {
    return t('Question must not exceed {max} characters', { max: questionLengthMatch[1] });
  }

  const positiveIntMatch = normalizedMessage.match(/^([a-zA-Z_-]+) must be a positive integer$/);
  if (positiveIntMatch?.[1]) {
    const field = positiveIntMatch[1].toLowerCase().replace(/[_-]/g, '');
    return field === 'conversationid'
      ? t('Conversation ID must be a positive integer')
      : field === 'datasource'
        ? t('Datasource ID must be a positive integer')
        : field === 'action'
          ? t('Action ID must be a positive integer')
          : field === 'aiprovider'
            ? t('AI Provider ID must be a positive integer')
            : field === 'limit'
              ? t('Limit must be a positive integer')
              : t('Validation error');
  }

  const maxLimitMatch = normalizedMessage.match(/^limit must be less than or equal to (\d+)$/);
  if (maxLimitMatch?.[1]) {
    return t('Limit must be at most {max}', { max: maxLimitMatch[1] });
  }

  return undefined;
};

const parseValidationDetail = (raw: string, t: QueryTranslation): string => {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) {
    return normalizedRaw;
  }

  const detailMatch = normalizedRaw.match(/^([^:]+):\s*(.+)$/);
  if (!detailMatch) {
    return localizeValidationMessage(normalizedRaw, t) ?? normalizedRaw;
  }

  const field = detailMatch[1];
  const message = detailMatch[2];
  const localizedMessage = localizeValidationMessage(message, t);
  if (!localizedMessage) {
    return normalizedRaw;
  }

  const localizedField = parseValidationField(field, t);
  return localizedField === field ? localizedMessage : `${localizedField}: ${localizedMessage}`;
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  const payload = error.payload as ApiErrorPayloadLike | undefined;
  const payloadMessage = payload?.message;
  if (typeof payloadMessage === 'string' && payloadMessage.trim()) {
    return payloadMessage;
  }

  return error.message || fallbackMessage;
};

const getApiErrorDetails = (error: unknown, t: QueryTranslation): string[] | undefined => {
  if (!(error instanceof ApiError)) {
    return undefined;
  }

  const payload = error.payload as ApiErrorPayloadLike | undefined;
  if (!payload || !Array.isArray(payload.details)) {
    return undefined;
  }

  const details = payload.details
    .map((item): string | undefined => {
      if (typeof item === 'string') {
        return parseValidationDetail(item, t);
      }

      if (typeof item === 'number' || typeof item === 'boolean' || item === null) {
        return String(item);
      }

      if (
        typeof item === 'object' &&
        item &&
        'message' in item &&
        typeof item.message === 'string'
      ) {
        return parseValidationDetail(item.message, t);
      }

      if (typeof item === 'object') {
        try {
          return JSON.stringify(item);
        } catch {
          return undefined;
        }
      }

      return undefined;
    })
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return details.length ? details : undefined;
};

const getApiErrorRetryAfter = (error: unknown): number | undefined => {
  if (!(error instanceof ApiError)) {
    return undefined;
  }

  const payload = error.payload as ApiErrorPayloadLike | undefined;
  if (!payload || payload.retryAfter === undefined || payload.retryAfter === null) {
    return undefined;
  }

  const raw = Number(payload.retryAfter);
  if (!Number.isFinite(raw) || raw <= 0) {
    return undefined;
  }

  return Math.min(120, Math.max(1, Math.floor(raw)));
};

const resolveStatusFromCode = (code?: QueryErrorCode): number | undefined =>
  code ? QUERY_ERROR_HTTP_STATUS[code] : undefined;

const inferQueryErrorCodeFromStatus = (status?: number): QueryErrorCode | undefined => {
  if (status === 401) {
    return QUERY_ERROR_CODES.UNAUTHENTICATED;
  }

  if (status === 403) {
    return QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN;
  }

  if (status === 404) {
    return QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND;
  }

  if (status === 429) {
    return QUERY_ERROR_CODES.RATE_LIMIT;
  }

  if (status === 400) {
    return QUERY_ERROR_CODES.VALIDATION_ERROR;
  }

  if (typeof status === 'number' && status >= 500) {
    return QUERY_ERROR_CODES.INTERNAL_ERROR;
  }

  return undefined;
};

const resolveStatus = (status?: number, code?: QueryErrorCode): number | undefined => {
  if (typeof status === 'number' && Number.isFinite(status)) {
    return status;
  }

  return resolveStatusFromCode(code);
};

export const parseQueryError = (
  error: unknown,
  fallbackMessage: string,
  t: QueryTranslation,
): QueryError => {
  if (!(error instanceof ApiError)) {
    const message = error instanceof Error ? error.message?.trim() : undefined;
    const localizedValidationMessage = message ? localizeValidationMessage(message, t) : undefined;
    if (localizedValidationMessage) {
      const parseForCode = message.toLowerCase().trim();
      const isValidationError =
        parseForCode.includes('question is required') ||
        parseForCode.includes('must not exceed') ||
        /positive integer|must be a positive integer|less than|not exceed/i.test(parseForCode);
      const isRateLimitHint =
        parseForCode.includes('retry') || parseForCode.includes('rate') || /429/.test(parseForCode);
      const inferredCode = isValidationError
        ? QUERY_ERROR_CODES.VALIDATION_ERROR
        : isRateLimitHint
          ? QUERY_ERROR_CODES.RATE_LIMIT
          : inferQueryErrorCode(message);
      const inferredStatus = resolveStatus(undefined, inferredCode);
      return {
        message: localizedValidationMessage,
        status: inferredStatus,
        code: inferredCode,
        advice: getErrorAdvice(
          inferredStatus,
          inferredCode ?? QUERY_ERROR_CODES.VALIDATION_ERROR,
          message,
          t,
        ),
      };
    }

    const parseForCode = message?.toLowerCase().trim() ?? '';
    if (
      parseForCode.includes('failed to fetch') ||
      parseForCode.includes('networkerror') ||
      parseForCode.includes('network request') ||
      parseForCode.includes('network error') ||
      parseForCode.includes('typeerror')
    ) {
      return {
        message: t('Network request failed. Please check your connection'),
        status: QUERY_ERROR_HTTP_STATUS[QUERY_ERROR_CODES.INTERNAL_ERROR],
        code: QUERY_ERROR_CODES.INTERNAL_ERROR,
        advice: t(QUERY_ERROR_MESSAGES[QUERY_ERROR_CODES.INTERNAL_ERROR]),
      };
    }

    const inferredCode = message
      ? (inferQueryErrorCode(message) ?? QUERY_ERROR_CODES.INTERNAL_ERROR)
      : QUERY_ERROR_CODES.INTERNAL_ERROR;
    const inferredStatus = resolveStatus(undefined, inferredCode);

    return {
      message: fallbackMessage,
      status: inferredStatus,
      code: inferredCode,
      advice: getErrorAdvice(inferredStatus, inferredCode, message, t),
    };
  }

  const status = Number.isFinite(error.status) && error.status > 0 ? error.status : undefined;
  const rawMessage = getApiErrorMessage(error, fallbackMessage);
  const normalizedMessage = rawMessage.trim();
  const code =
    error instanceof ApiError
      ? (normalizeQueryErrorCode(error.code) ??
        normalizeQueryErrorCode((error.payload as ApiErrorPayloadLike | undefined)?.code) ??
        (normalizedMessage ? inferQueryErrorCode(normalizedMessage) : undefined) ??
        inferQueryErrorCodeFromStatus(status) ??
        QUERY_ERROR_CODES.INTERNAL_ERROR)
      : undefined;
  const resolvedStatus = resolveStatus(status, code);
  const sqlMatch =
    code === QUERY_ERROR_CODES.DATABASE_ERROR
      ? SQL_ERROR_PATTERNS.map((pattern) => rawMessage.match(pattern)).find(Boolean)
      : undefined;
  const extractedSql = sqlMatch ? sqlMatch[0].replace(/^SQL:\s*/i, '').trim() : undefined;
  const cleanedMessage = sqlMatch
    ? rawMessage
        .replace(sqlMatch[0], '')
        .replace(/^\s*-\s*/, '')
        .replace(/\s*;\s*$/, '')
        .trim()
    : rawMessage;

  return {
    message: cleanedMessage || rawMessage,
    sql: extractedSql,
    status: resolvedStatus,
    code,
    advice: getErrorAdvice(resolvedStatus, code, rawMessage, t),
    details: getApiErrorDetails(error, t),
    retryAfter: getApiErrorRetryAfter(error),
  };
};

export const getQueryErrorAction = (
  error: QueryError | null,
  t: QueryTranslation,
  ctx: ErrorActionContext,
): QueryErrorAction | null => {
  if (!error) {
    return null;
  }

  if (error.status === 401 || error.code === QUERY_ERROR_CODES.UNAUTHENTICATED) {
    return {
      label: t('Please re-login and try again'),
      onClick: () => {
        ctx.onNewConversation?.();
        ctx.push('/login');
      },
    };
  }

  if (error.code === QUERY_ERROR_CODES.CONFIGURATION_ERROR) {
    const message = error.message.toLowerCase();
    if (
      /(provider|ai provider|provider.*query|ai provider|please configure|未设置|未配置|配置.*provider|no ai provider|selected ai provider|未设置.*provider)/i.test(
        message,
      )
    ) {
      return {
        label: t('Configure AI Provider'),
        onClick: () => {
          ctx.onNewConversation?.();
          ctx.push('/dashboard/ai-providers');
        },
      };
    }

    if (
      /(datasource|datasourceid|数据源|数据仓|数据库|no datasource|selected datasource|schema|schema.*not synced|no tables found|未同步|暂无表|表结构|未找到表|未配置)/i.test(
        message,
      )
    ) {
      return {
        label: t('Configure Datasource'),
        onClick: () => {
          ctx.onNewConversation?.();
          ctx.push('/dashboard/datasources');
        },
      };
    }
  }

  if (
    error.code === QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN ||
    error.code === QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND
  ) {
    return {
      label: t('New Conversation'),
      onClick: () => ctx.onNewConversation?.(),
    };
  }

  if (error.status === 403 || error.status === 404) {
    return {
      label: t('New Conversation'),
      onClick: () => {
        ctx.onNewConversation?.();
      },
    };
  }

  if (
    error.code === QUERY_ERROR_CODES.INTERNAL_ERROR ||
    error.code === QUERY_ERROR_CODES.RATE_LIMIT ||
    (error.status !== undefined && error.status >= 500) ||
    error.status === 429
  ) {
    if (!ctx.onRetry) {
      return null;
    }

    const isCoolingDown = typeof ctx.retryCountdown === 'number' && ctx.retryCountdown > 0;
    const label = isCoolingDown
      ? t('Retry in {seconds} seconds', { seconds: ctx.retryCountdown })
      : t('Retry');
    return {
      label,
      onClick: () => ctx.onRetry?.(),
      disabled: isCoolingDown || Boolean(ctx.isSubmitting),
    };
  }

  return null;
};

export { QUERY_ERROR_CODES, normalizeQueryErrorCode, type QueryErrorCode };
