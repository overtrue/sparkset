/**
 * AI Client interface and prompt building utilities
 */

import { TableSchema } from '../db/types.js';

export interface ModelCallOptions {
  model?: string;
  provider?: string;
  prompt: string;
  apiKey?: string;
  baseURL?: string;
}

export interface AIClient {
  generateSQL: (options: ModelCallOptions) => Promise<string>;
}

export interface PromptOptions {
  question: string;
  schemas: TableSchema[];
  limit?: number;
}

/**
 * 构建用于生成 SQL 的提示词
 * 包含 Schema 信息、安全约束和输出格式要求
 */
export function buildPrompt(options: PromptOptions): string {
  const { question, schemas, limit } = options;

  // 格式化 Schema 信息
  const schemaSection = formatSchemas(schemas);

  // 构建完整提示词
  const prompt = `You are a professional SQL generation assistant. Based on the user's question and database Schema information, generate accurate and secure SQL query statements.

## Database Schema Information

${schemaSection}

## Important Constraints

1. **Only use provided tables**: **Strictly prohibited** to use tables not listed in the Schema information. If the user's question involves a table that is not in the Schema, clearly inform the user that the table does not exist.
2. **Only use provided columns**: **Strictly prohibited** to use column names not listed in the table. Only use columns explicitly listed in the Schema.
3. **Read-only queries**: Only generate SELECT query statements
4. **No DDL**: CREATE, ALTER, DROP and other data definition statements are not allowed
5. **No DML**: INSERT, UPDATE, DELETE and other data modification statements are not allowed
6. **No system operations**: Accessing system tables or executing system functions is not allowed
7. **Auto-add LIMIT**: If the user's question involves operations like "list" or "show" without specifying a quantity, add LIMIT 100 by default

## Output Requirements

1. **Pure SQL statement**: Only output SQL code, do not include markdown code block markers (such as \`\`\`sql)
2. **Single statement**: Only generate one SQL statement
3. **Format specification**: Use standard SQL syntax, wrap table names and column names with backticks (if they contain special characters)
4. **LIMIT handling**: ${limit ? `This query is limited to return ${limit} records, please add LIMIT ${limit} to the SQL` : 'If the query may return a large amount of data, add an appropriate LIMIT clause (recommended LIMIT 100)'}
5. **Table name validation**: Before generating SQL, confirm that all table names are in the Schema information above. If a table in the user's question does not exist, generate a simple SELECT statement with a comment explaining that the table does not exist.

## User Question

${question}

Please generate a SQL query statement based on the above information:`;

  return prompt;
}

/**
 * 格式化 Schema 信息为可读的文本格式
 */
function formatSchemas(schemas: TableSchema[]): string {
  if (schemas.length === 0) {
    return 'No tables available in the current datasource.';
  }

  const sections = schemas.map((schema) => {
    const tableName = schema.tableName;
    const tableComment = schema.tableComment ? ` (${schema.tableComment})` : '';
    const semanticDesc = schema.semanticDescription
      ? `\n  Semantic Description: ${schema.semanticDescription}`
      : '';

    const columns = schema.columns
      .map(
        (col: { name: string; type: string; comment?: string; semanticDescription?: string }) => {
          const comment = col.comment ? ` -- ${col.comment}` : '';
          const semanticDesc = col.semanticDescription ? ` [${col.semanticDescription}]` : '';
          return `  - \`${col.name}\` ${col.type}${semanticDesc}${comment}`;
        },
      )
      .join('\n');

    return `### Table: \`${tableName}\`${tableComment}${semanticDesc}
${columns}`;
  });

  return sections.join('\n\n');
}
