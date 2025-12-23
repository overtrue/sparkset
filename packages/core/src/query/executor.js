const READONLY_PREFIX = [
  /^\s*select\b/i,
  /^\s*with\b/i,
  /^\s*show\b/i,
  /^\s*describe\b/i,
  /^\s*explain\b/i,
];
const ensureReadOnly = (sql) => {
  let trimmed = sql.trim().replace(/;+$/, '');
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
  trimmed = trimmed.trim();
  if (!READONLY_PREFIX.some((re) => re.test(trimmed))) {
    throw new Error('Only read-only queries are allowed (SELECT/SHOW/DESCRIBE/EXPLAIN)');
  }
  const forbidden = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke)\b/i;
  if (forbidden.test(trimmed)) {
    throw new Error('Write operations are blocked in query runner');
  }
};
const applyLimit = (sql, limit) => {
  if (!limit) return sql;
  const hasLimit = /limit\s+\d+/i.test(sql);
  if (hasLimit) return sql;
  const cleaned = sql.trim().replace(/;+$/, '');
  return `${cleaned} LIMIT ${limit}`;
};
function parseDatabaseError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = String(error);
  const errorPatterns = [
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
        const codeMessages = {
          1146: '表不存在',
          1054: '列不存在',
          1064: 'SQL 语法错误',
          1045: '数据库访问被拒绝',
          1049: '数据库不存在',
        };
        return codeMessages[code] || `数据库错误 (代码: ${code})`;
      },
    },
  ];
  for (const { pattern, message } of errorPatterns) {
    const match = errorString.match(pattern);
    if (match) {
      return new Error(message(match));
    }
  }
  if (errorString.includes("doesn't exist")) {
    const tableMatch = errorString.match(/Table ['"`]([^'"`]+)['"`] doesn't exist/i);
    if (tableMatch) {
      return new Error(`表 "${tableMatch[1]}" 不存在`);
    }
  }
  return error instanceof Error ? error : new Error(errorMessage);
}
export class QueryExecutor {
  deps;
  constructor(deps) {
    this.deps = deps;
  }
  async execute(sqlSnippets, opts = {}) {
    const allRows = [];
    for (const snippet of sqlSnippets) {
      try {
        const client = await this.deps.getDBClient(snippet.datasourceId);
        const cfg = await this.deps.getDatasourceConfig(snippet.datasourceId);
        const sql = applyLimit(snippet.sql, opts.limit);
        ensureReadOnly(sql);
        const result = await client.query(cfg, sql);
        allRows.push(...result.rows);
      } catch (error) {
        throw parseDatabaseError(error);
      }
    }
    return { rows: allRows, sql: sqlSnippets, summary: `Executed ${sqlSnippets.length} query(s)` };
  }
}
export class SqlActionExecutor {
  deps;
  constructor(deps) {
    this.deps = deps;
  }
  async execute(sqlSnippets, opts = {}) {
    const allRows = [];
    for (const snippet of sqlSnippets) {
      try {
        const client = await this.deps.getDBClient(snippet.datasourceId);
        const cfg = await this.deps.getDatasourceConfig(snippet.datasourceId);
        let sql = snippet.sql.trim().replace(/;+$/, '');
        const isSelect = /^\s*select\b/i.test(sql);
        if (isSelect && opts.limit) {
          sql = applyLimit(sql, opts.limit);
        }
        const trimmed = sql.trim();
        const forbiddenDDL = /\b(drop|alter|truncate|create|grant|revoke)\b/i;
        if (forbiddenDDL.test(trimmed)) {
          throw new Error('DDL operations (CREATE/ALTER/DROP) are not allowed in Actions');
        }
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
        const result = await client.query(cfg, sql);
        allRows.push(...result.rows);
      } catch (error) {
        throw parseDatabaseError(error);
      }
    }
    return { rows: allRows, sql: sqlSnippets, summary: `Executed ${sqlSnippets.length} query(s)` };
  }
}
//# sourceMappingURL=executor.js.map
