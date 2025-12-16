import type { SqlSnippet } from '@sparkset/core/query/types';

// SQL Action 执行结果
export interface SqlActionResult {
  rows: unknown[];
  sql: SqlSnippet[];
  summary?: string;
}

// API Action 执行结果
export interface ApiActionResult {
  statusCode: number;
  body: unknown;
  headers?: Record<string, string>;
  duration?: number; // 可选：请求耗时
}

// Action 执行响应（API 返回格式）
export interface ActionExecutionResponse {
  actionId: number;
  result: SqlActionResult | ApiActionResult | unknown;
}

// 类型守卫函数
export function isSqlResult(result: unknown): result is SqlActionResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'rows' in result &&
    'sql' in result &&
    Array.isArray((result as SqlActionResult).rows) &&
    Array.isArray((result as SqlActionResult).sql)
  );
}

export function isApiResult(result: unknown): result is ApiActionResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'statusCode' in result &&
    typeof (result as ApiActionResult).statusCode === 'number' &&
    'body' in result
  );
}
