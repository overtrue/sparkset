import { DBClient, DataSourceConfig, QueryResult } from '@sparkline/db';
import { ExecutionResult, SqlSnippet } from './types';

export interface ExecutorDeps {
  getDBClient: (datasourceId: number) => Promise<DBClient>;
  getDatasourceConfig: (datasourceId: number) => Promise<DataSourceConfig>;
}

interface ExecuteOptions {
  limit?: number;
}

const READONLY_PREFIX = [
  /^\s*select\b/i,
  /^\s*with\b/i,
  /^\s*show\b/i,
  /^\s*describe\b/i,
  /^\s*explain\b/i,
];

const ensureReadOnly = (sql: string) => {
  // 移除末尾的分号
  let trimmed = sql.trim().replace(/;+$/, '');

  // 检查是否包含多个语句（通过分号分隔，但排除注释中的分号）
  // 先移除单行注释（-- 到行尾）
  const withoutSingleLineComments = trimmed.replace(/--[^\n]*/g, '');
  // 移除多行注释（/* ... */）
  const withoutComments = withoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');

  // 检查是否还有分号（表示多语句）
  if (withoutComments.includes(';')) {
    throw new Error('Multi-statement queries are not allowed');
  }

  // 使用清理后的 SQL 进行其他检查
  trimmed = withoutComments.trim();

  if (!READONLY_PREFIX.some((re) => re.test(trimmed))) {
    throw new Error('Only read-only queries are allowed (SELECT/SHOW/DESCRIBE/EXPLAIN)');
  }
  const forbidden = /(insert|update|delete|drop|alter|truncate|create|grant|revoke)/i;
  if (forbidden.test(trimmed)) {
    throw new Error('Write operations are blocked in query runner');
  }
};

const applyLimit = (sql: string, limit?: number) => {
  if (!limit) return sql;
  const hasLimit = /limit\s+\d+/i.test(sql);
  if (hasLimit) return sql;
  const cleaned = sql.trim().replace(/;+$/, '');
  return `${cleaned} LIMIT ${limit}`;
};

export class QueryExecutor {
  constructor(private deps: ExecutorDeps) {}

  async execute(sqlSnippets: SqlSnippet[], opts: ExecuteOptions = {}): Promise<ExecutionResult> {
    const allRows: unknown[] = [];

    for (const snippet of sqlSnippets) {
      const client = await this.deps.getDBClient(snippet.datasourceId);
      const cfg = await this.deps.getDatasourceConfig(snippet.datasourceId);
      const sql = applyLimit(snippet.sql, opts.limit);
      ensureReadOnly(sql);
      const result: QueryResult = await client.query(cfg, sql);
      allRows.push(...result.rows);
    }

    return { rows: allRows, sql: sqlSnippets, summary: `Executed ${sqlSnippets.length} query(s)` };
  }
}
