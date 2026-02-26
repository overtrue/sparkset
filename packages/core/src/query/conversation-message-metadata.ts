import {
  CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
  CONVERSATION_MESSAGE_METADATA_VERSION,
  type ConversationMessageMetadataKind,
} from './protocol';

export type ParsedQueryResultRow = Record<string, unknown>;

export interface ParsedQueryResponse {
  sql?: string;
  rows: ParsedQueryResultRow[];
  summary?: string;
  rowCount?: number;
  hasResult?: boolean;
  datasourceId?: number;
  aiProviderId?: number;
  limit?: number;
}

export interface ParsedConversationMessageMetadata {
  schemaVersion: number;
  kind: ConversationMessageMetadataKind;
  sql?: string;
  result?: ParsedQueryResponse;
  rowCount: number | null;
  summary?: string;
  hasResult?: boolean;
  datasourceId?: number;
  aiProviderId?: number;
  limit?: number;
}

export interface BuildConversationMessageMetadataInput {
  datasource?: number;
  aiProvider?: number;
  limit?: number;
}

export interface BuildConversationMessageMetadataResult {
  sql: string;
  rows: unknown[];
  rowCount?: number;
  summary?: string;
  datasourceId?: number;
  aiProviderId?: number;
  limit?: number;
}

type UnknownRecord = Record<string, unknown>;

interface ParsedMetadataResult {
  result?: ParsedQueryResponse;
  rowCount?: number;
  summary?: string;
  hasResult?: boolean;
  datasourceId?: number;
  aiProviderId?: number;
  limit?: number;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const toText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parsePositiveInt = (value: unknown, allowZero = false): number | undefined => {
  if (typeof value === 'number') {
    const parsed = Number.isFinite(value) && Number.isInteger(value) ? value : NaN;
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    if (allowZero ? parsed >= 0 : parsed > 0) {
      return parsed;
    }
    return undefined;
  }

  if (typeof value === 'string') {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || !Number.isInteger(normalized)) {
      return undefined;
    }
    if (allowZero ? normalized >= 0 : normalized > 0) {
      return normalized;
    }
    return undefined;
  }

  return undefined;
};

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 0) {
      return false;
    }
    if (value === 1) {
      return true;
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return undefined;
};

const parseRows = (value: unknown): ParsedQueryResultRow[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.map((row) => (isRecord(row) ? (row as ParsedQueryResultRow) : {}));
};

const isQueryResponse = (value: unknown): value is ParsedQueryResponse =>
  isRecord(value) && typeof value.sql === 'string' && Array.isArray(value.rows);

const parseMetadataResult = (value: unknown, fallbackSql?: string): ParsedMetadataResult => {
  if (!isRecord(value)) {
    return {};
  }

  const isRowsArray = Array.isArray(value);
  const parsedRows = parseRows(isRowsArray ? value : value.rows);
  const rows = parsedRows;
  const isValidResponse = !isRowsArray && isQueryResponse(value);
  const hasResultValue = parseBoolean(value.hasResult) ?? undefined;
  const parsedRowCount = parsePositiveInt(value.rowCount, true);
  const parsedDatasourceId = parsePositiveInt(value.datasourceId);
  const parsedAiProviderId = parsePositiveInt(value.aiProviderId);
  const parsedLimit = parsePositiveInt(value.limit);
  const summary = toText(value.summary);
  const sql = toText(value.sql) ?? (isRowsArray ? fallbackSql : undefined);

  if (isValidResponse || rows !== undefined) {
    const result: ParsedQueryResponse = {
      rows: rows ?? [],
      ...(sql !== undefined ? { sql } : {}),
      ...(summary ? { summary } : {}),
      ...(parsedRowCount !== undefined ? { rowCount: parsedRowCount } : {}),
      ...(hasResultValue !== undefined ? { hasResult: hasResultValue } : {}),
      ...(parsedDatasourceId !== undefined ? { datasourceId: parsedDatasourceId } : {}),
      ...(parsedAiProviderId !== undefined ? { aiProviderId: parsedAiProviderId } : {}),
      ...(parsedLimit !== undefined ? { limit: parsedLimit } : {}),
    };

    const rowCount = parsedRowCount ?? (rows ? rows.length : undefined);

    return {
      result,
      rowCount,
      summary,
      hasResult: hasResultValue ?? (rowCount !== undefined ? rowCount > 0 : undefined),
      datasourceId: parsedDatasourceId,
      aiProviderId: parsedAiProviderId,
      limit: parsedLimit,
    };
  }

  return {
    rowCount: parsedRowCount,
    summary,
    hasResult: hasResultValue,
    datasourceId: parsedDatasourceId,
    aiProviderId: parsedAiProviderId,
    limit: parsedLimit,
  };
};

export const parseConversationMessageMetadata = (
  metadata: unknown,
): ParsedConversationMessageMetadata | null => {
  if (!isRecord(metadata)) {
    return null;
  }

  const meta = metadata;
  const schemaVersion = parsePositiveInt(
    meta.version ?? meta.schemaVersion ?? meta.metadataVersion,
    false,
  );
  const parsedSchemaVersion = schemaVersion ?? CONVERSATION_MESSAGE_METADATA_VERSION;
  const kind = toText(meta.kind);
  if (kind && kind !== CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT) {
    return null;
  }

  const rawSql = toText(meta.sql);
  const nested = parseMetadataResult(meta.result, rawSql);
  const rootRowCount = parsePositiveInt(meta.rowCount, true);
  const parsedDatasourceId = parsePositiveInt(meta.datasourceId);
  const parsedAiProviderId = parsePositiveInt(meta.aiProviderId);
  const parsedLimit = parsePositiveInt(meta.limit);
  const parsedHasResult = parseBoolean(meta.hasResult);
  const rowCount = nested.rowCount ?? rootRowCount ?? null;
  const summary = nested.summary ?? toText(meta.summary);
  const hasResult =
    parsedHasResult ?? nested.hasResult ?? (rowCount !== null ? rowCount > 0 : undefined);
  const datasourceId = nested.datasourceId ?? parsedDatasourceId;
  const aiProviderId = nested.aiProviderId ?? parsedAiProviderId;
  const limit = nested.limit ?? parsedLimit;

  const hasQueryShape =
    rawSql !== undefined ||
    nested.result !== undefined ||
    rowCount !== null ||
    summary !== undefined ||
    datasourceId !== undefined ||
    aiProviderId !== undefined ||
    limit !== undefined ||
    parsedHasResult !== undefined;

  if (!hasQueryShape) {
    return null;
  }

  return {
    schemaVersion: parsedSchemaVersion,
    kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
    sql: rawSql ?? nested.result?.sql,
    result: nested.result,
    rowCount,
    summary,
    hasResult,
    datasourceId,
    aiProviderId,
    limit,
  };
};

export const parseLegacyResultRowCountFromMessageContent = (content: string): number | null => {
  const normalizeNumber = (value: string): number => Number(value.replace(/,/g, '').trim());

  const zeroResultPatterns = [
    /no\s+rows?/i,
    /no\s+matching\s+rows?/i,
    /no\s+data\s+returned/i,
    /no\s+record(?:s)?\s+found/i,
    /no\s+results?\s+found/i,
    /no\s+data\s+found/i,
    /did(?:\s+not|n(?:'|’)?t)\s+return(?:\s+any)?\s+rows?/i,
    /没有\s*查询到?结果/i,
    /未查询到.*?(?:记录|结果|数据)/i,
    /未找到.*?(?:记录|结果|数据)/i,
    /查无.*?(?:记录|结果|数据)/i,
    /查询结果.*为空/i,
    /结果.*为空/i,
    /暂未\s*查到.*结果/i,
    /未查询到/i,
    /没有\s*返回.*(?:数据|结果)/i,
    /0\s*条.*(?:记录|结果|数据)/i,
    /found\s+0\s*(?:records?|rows?)/i,
    /returned\s+0\s*rows?/i,
    /returned\s+0\s*records?/i,
  ];

  if (zeroResultPatterns.some((pattern) => pattern.test(content))) {
    return 0;
  }

  const patterns = [
    /(\d[\d,]*)\s*条数据/.exec(content),
    /(\d[\d,]*)\s*条结果/.exec(content),
    /返回\s*(\d[\d,]*)\s*条/.exec(content),
    /共\s*(\d[\d,]*)\s*条/.exec(content),
    /found\s+(\d[\d,]*)\s*records?/i.exec(content),
    /found\s+(\d[\d,]*)\s*rows?/i.exec(content),
    /(\d[\d,]*)\s*records?\s+found/i.exec(content),
    /returned\s+(\d[\d,]*)\s*rows?/i.exec(content),
    /(\d[\d,]*)\s*rows?\s+returned/i.exec(content),
    /got\s+(\d[\d,]*)\s*rows?/i.exec(content),
  ];

  for (const match of patterns) {
    if (!match?.[1]) {
      continue;
    }

    const parsed = normalizeNumber(match[1]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export const getConversationMessageRowCount = (
  metadata: unknown,
  fallbackContent?: string,
): number | null => {
  const parsed = parseConversationMessageMetadata(metadata);
  if (!parsed) {
    if (!fallbackContent) {
      return null;
    }
    return parseLegacyResultRowCountFromMessageContent(fallbackContent);
  }

  if (parsed.rowCount !== null) {
    return parsed.rowCount;
  }
  if (parsed?.hasResult === false) {
    return 0;
  }

  if (!fallbackContent) {
    return null;
  }

  return parseLegacyResultRowCountFromMessageContent(fallbackContent);
};

export const buildConversationMessageMetadata = (
  parsed: BuildConversationMessageMetadataInput,
  result: BuildConversationMessageMetadataResult,
) => {
  const rows = Array.isArray(result.rows) ? (parseRows(result.rows) ?? []) : [];
  const parsedRowCount = parsePositiveInt(result.rowCount, true);
  const rowCount = parsedRowCount ?? rows.length;
  const datasourceId = parsePositiveInt(result.datasourceId) ?? parsed.datasource;
  const aiProviderId = parsePositiveInt(result.aiProviderId) ?? parsed.aiProvider;
  const limit = parsePositiveInt(result.limit) ?? parsed.limit;

  return {
    schemaVersion: CONVERSATION_MESSAGE_METADATA_VERSION,
    kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
    sql: result.sql,
    rowCount,
    summary: result.summary,
    hasResult: rowCount > 0,
    result: {
      sql: result.sql,
      rows,
      ...(result.summary ? { summary: result.summary } : {}),
      rowCount,
      hasResult: rowCount > 0,
      ...(datasourceId ? { datasourceId } : {}),
      ...(aiProviderId ? { aiProviderId } : {}),
      ...(limit ? { limit } : {}),
    },
    ...(datasourceId ? { datasourceId } : {}),
    ...(aiProviderId ? { aiProviderId } : {}),
    ...(limit ? { limit } : {}),
  };
};
