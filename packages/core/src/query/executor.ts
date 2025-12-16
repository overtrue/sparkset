import { DBClient, DataSourceConfig, QueryResult } from '@sparkset/db';
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

  // 检查是否包含多个语句（通过分号分隔，但排除注释和字符串字面量中的分号）
  // 先移除字符串字面量，使用占位符避免影响分号检查
  let cleaned = trimmed;

  // 移除单引号字符串（包括转义的单引号），使用占位符
  cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, '__STRING__');
  // 移除双引号字符串（包括转义的双引号），使用占位符
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, '__STRING__');

  // 移除单行注释（-- 到行尾）
  cleaned = cleaned.replace(/--[^\n]*/g, '');
  // 移除多行注释（/* ... */）
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // 检查是否还有分号（表示多语句）
  // 因为我们已经在开头移除了末尾的分号，所以如果还有分号，一定是中间的分号，表示多语句查询
  if (cleaned.includes(';')) {
    throw new Error(
      `Multi-statement queries are not allowed. SQL: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`,
    );
  }

  // 使用原始 SQL（移除末尾分号后）进行其他检查
  trimmed = trimmed.trim();

  if (!READONLY_PREFIX.some((re) => re.test(trimmed))) {
    throw new Error('Only read-only queries are allowed (SELECT/SHOW/DESCRIBE/EXPLAIN)');
  }
  // 使用单词边界 \b 确保只匹配完整的 SQL 关键字，避免误匹配字段名（如 created_at, updated_at）
  const forbidden = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i;
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

/**
 * 解析数据库错误并返回友好的错误信息
 */
function parseDatabaseError(error: unknown): Error {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = String(error);

  // MySQL 错误代码映射
  const errorPatterns: Array<{
    pattern: RegExp;
    message: (match: RegExpMatchArray) => string;
  }> = [
    {
      pattern: /Table ['"`]([^'"`]+)['"`] doesn't exist/i,
      message: (match) => `表 "${match[1]}" 不存在`,
    },
    {
      pattern: /Unknown column ['"`]([^'"`]+)['"`]/i,
      message: (match) => `列 "${match[1]}" 不存在`,
    },
    {
      pattern: /You have an error in your SQL syntax/i,
      message: () => 'SQL 语法错误',
    },
    {
      pattern: /Access denied for user/i,
      message: () => '数据库访问被拒绝，请检查用户名和密码',
    },
    {
      pattern: /Unknown database ['"`]([^'"`]+)['"`]/i,
      message: (match) => `数据库 "${match[1]}" 不存在`,
    },
    {
      pattern: /Code: [`'](\d+)[`']/i,
      message: (match) => {
        const code = match[1];
        const codeMessages: Record<string, string> = {
          '1146': '表不存在',
          '1054': '列不存在',
          '1064': 'SQL 语法错误',
          '1045': '数据库访问被拒绝',
          '1049': '数据库不存在',
        };
        return codeMessages[code] || `数据库错误 (代码: ${code})`;
      },
    },
  ];

  // 尝试匹配错误模式
  for (const { pattern, message } of errorPatterns) {
    const match = errorString.match(pattern);
    if (match) {
      return new Error(message(match));
    }
  }

  // 如果没有匹配到，尝试从 Prisma 错误消息中提取信息
  if (errorString.includes("doesn't exist")) {
    const tableMatch = errorString.match(/Table ['"`]([^'"`]+)['"`] doesn't exist/i);
    if (tableMatch) {
      return new Error(`表 "${tableMatch[1]}" 不存在`);
    }
  }

  // 返回原始错误
  return error instanceof Error ? error : new Error(errorMessage);
}

export class QueryExecutor {
  constructor(private deps: ExecutorDeps) {}

  async execute(sqlSnippets: SqlSnippet[], opts: ExecuteOptions = {}): Promise<ExecutionResult> {
    const allRows: unknown[] = [];

    for (const snippet of sqlSnippets) {
      try {
        const client = await this.deps.getDBClient(snippet.datasourceId);
        const cfg = await this.deps.getDatasourceConfig(snippet.datasourceId);
        const sql = applyLimit(snippet.sql, opts.limit);
        ensureReadOnly(sql);
        const result: QueryResult = await client.query(cfg, sql);
        allRows.push(...result.rows);
      } catch (error) {
        // 解析数据库错误并抛出友好的错误信息
        throw parseDatabaseError(error);
      }
    }

    return { rows: allRows, sql: sqlSnippets, summary: `Executed ${sqlSnippets.length} query(s)` };
  }
}

/**
 * SQL Action 执行器，支持 DML 操作（INSERT/UPDATE/DELETE）
 * 与 QueryExecutor 的区别：不限制只读查询，允许执行修改操作
 */
export class SqlActionExecutor {
  constructor(private deps: ExecutorDeps) {}

  async execute(sqlSnippets: SqlSnippet[], opts: ExecuteOptions = {}): Promise<ExecutionResult> {
    const allRows: unknown[] = [];

    for (const snippet of sqlSnippets) {
      try {
        const client = await this.deps.getDBClient(snippet.datasourceId);
        const cfg = await this.deps.getDatasourceConfig(snippet.datasourceId);
        let sql = snippet.sql.trim().replace(/;+$/, '');

        // 对于 DML 操作，不应用 LIMIT（LIMIT 只适用于 SELECT）
        const isSelect = /^\s*select\b/i.test(sql);
        if (isSelect && opts.limit) {
          sql = applyLimit(sql, opts.limit);
        }

        // 仍然禁止 DDL 操作（CREATE/ALTER/DROP 等）
        const trimmed = sql.trim();
        const forbiddenDDL = /\b(drop|alter|truncate|create|grant|revoke)\b/i;
        if (forbiddenDDL.test(trimmed)) {
          throw new Error('DDL operations (CREATE/ALTER/DROP) are not allowed in Actions');
        }

        // 检查多语句（仍然禁止）
        let cleaned = trimmed;
        cleaned = cleaned.replace(/'([^'\\]|\\.)*'/g, '__STRING__');
        cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, '__STRING__');
        cleaned = cleaned.replace(/--[^\n]*/g, '');
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        if (cleaned.includes(';')) {
          throw new Error(
            `Multi-statement queries are not allowed. SQL: ${sql.substring(0, 200)}${sql.length > 200 ? '...' : ''}`,
          );
        }

        const result: QueryResult = await client.query(cfg, sql);
        allRows.push(...result.rows);
      } catch (error) {
        // 解析数据库错误并抛出友好的错误信息
        throw parseDatabaseError(error);
      }
    }

    return { rows: allRows, sql: sqlSnippets, summary: `Executed ${sqlSnippets.length} query(s)` };
  }
}
