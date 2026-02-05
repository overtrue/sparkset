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

export interface ActionPromptOptions {
  name: string;
  description: string;
  schemas: TableSchema[];
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

/**
 * 构建用于生成 Action SQL 的提示词
 * 与查询 prompt 的区别：支持 DML 操作（INSERT, UPDATE, DELETE）和命名参数
 */
export function buildActionPrompt(options: ActionPromptOptions): string {
  const { name, description, schemas } = options;

  // 格式化 Schema 信息
  const schemaSection = formatSchemas(schemas);

  // 根据名称和描述推断操作类型
  const lowerName = name.toLowerCase();
  const lowerDesc = description.toLowerCase();
  let operationHint = '';

  if (
    lowerName.includes('查询') ||
    lowerName.includes('获取') ||
    lowerName.includes('列表') ||
    lowerName.includes('query') ||
    lowerName.includes('get') ||
    lowerName.includes('list') ||
    lowerName.includes('fetch') ||
    lowerDesc.includes('查询') ||
    lowerDesc.includes('获取') ||
    lowerDesc.includes('列表') ||
    lowerDesc.includes('query') ||
    lowerDesc.includes('get') ||
    lowerDesc.includes('list') ||
    lowerDesc.includes('fetch')
  ) {
    operationHint = 'This is a query operation, please use SELECT statement.';
  } else if (
    lowerName.includes('插入') ||
    lowerName.includes('添加') ||
    lowerName.includes('创建') ||
    lowerName.includes('insert') ||
    lowerName.includes('add') ||
    lowerName.includes('create') ||
    lowerDesc.includes('插入') ||
    lowerDesc.includes('添加') ||
    lowerDesc.includes('创建') ||
    lowerDesc.includes('insert') ||
    lowerDesc.includes('add') ||
    lowerDesc.includes('create')
  ) {
    operationHint = 'This is an insert operation, please use INSERT statement.';
  } else if (
    lowerName.includes('更新') ||
    lowerName.includes('修改') ||
    lowerName.includes('编辑') ||
    lowerName.includes('update') ||
    lowerName.includes('modify') ||
    lowerName.includes('edit') ||
    lowerDesc.includes('更新') ||
    lowerDesc.includes('修改') ||
    lowerDesc.includes('编辑') ||
    lowerDesc.includes('update') ||
    lowerDesc.includes('modify') ||
    lowerDesc.includes('edit')
  ) {
    operationHint = 'This is an update operation, please use UPDATE statement.';
  } else if (
    lowerName.includes('删除') ||
    lowerName.includes('移除') ||
    lowerName.includes('封禁') ||
    lowerName.includes('delete') ||
    lowerName.includes('remove') ||
    lowerName.includes('ban') ||
    lowerDesc.includes('删除') ||
    lowerDesc.includes('移除') ||
    lowerDesc.includes('封禁') ||
    lowerDesc.includes('delete') ||
    lowerDesc.includes('remove') ||
    lowerDesc.includes('ban')
  ) {
    operationHint = 'This is a delete or update operation, please use DELETE or UPDATE statement.';
  }

  // 构建完整提示词
  const prompt = `You are a professional SQL generation assistant. Based on the Action name and description provided by the user, along with the database Schema information, generate accurate and secure SQL statements.

**Important: Your response must be valid JSON format, without any other text, markdown code blocks, or explanations.**

## Database Schema Information

${schemaSection}

## Action Information

- **Name**: ${name}
${description ? `- **Description**: ${description}` : '- **Description**: None (infer from name only)'}
${operationHint ? `- **Operation Type Hint**: ${operationHint}` : ''}

## Important Constraints

1. **Only use provided tables**: **Strictly prohibited** to use tables not listed in the Schema information. If the Action involves a table that is not in the Schema, return a JSON error.
2. **Only use provided columns**: **Strictly prohibited** to use column names not listed in the table. Only use columns explicitly listed in the Schema.
3. **DML operations supported**: Can generate SELECT, INSERT, UPDATE, DELETE statements based on Action description.
4. **No DDL**: CREATE, ALTER, DROP and other data definition statements are not allowed.
5. **No system operations**: Accessing system tables or executing system functions is not allowed.
6. **Use named parameters**: For values that require user input, must use named parameter format \`:paramName\` (e.g., \`:userId\`, \`:user_id\`, \`:limit\`).
7. **Parameter naming conventions**:
   - Use meaningful parameter names (e.g., \`:userId\` instead of \`:id\`)
   - Parameter names should use lowercase letters and underscores (e.g., \`:user_id\`)
   - Infer required parameters based on Action description

## Output Format Requirements (Must Strictly Follow)

**Your response must be pure JSON text, in the following format:**
 
On success (must include SQL and parameter definitions):
{
  "success": true,
  "sql": "SELECT * FROM \`users\` WHERE \`id\` = :userId",
  "parameters": [
    {
      "name": "userId",
      "type": "number",
      "required": true,
      "label": "User Id",
      "description": "User ID"
    }
  ]
}

On failure:
{"success": false, "error": "Table does not exist or insufficient information"}

**Parameter Definition Notes:**
- name: Parameter name (consistent with :paramName in SQL, without the colon)
- type: Parameter type, must be "string", "number", or "boolean"
- required: Whether required, true or false
- label: Display label (optional, uses name if not provided)
- description: Parameter description (optional)

**Strictly Prohibited:**
- ❌ Do not use markdown code blocks (do not include \`\`\`json or \`\`\`)
- ❌ Do not add any explanatory text, comments, or explanations
- ❌ Do not return pure SQL text
- ❌ Do not return plain text error messages
- ✅ Only return valid JSON object

## SQL Statement Requirements

- Single statement
- Use standard SQL syntax, wrap table names and column names with backticks (if they contain special characters)
- Use named parameters (format: \`:paramName\`) in WHERE clauses, VALUES clauses, SET clauses, and other places that require user input

## Examples

If Action is "Query User" or "查询用户", on success should return:
{
  "success": true,
  "sql": "SELECT * FROM \`users\` WHERE \`id\` = :userId",
  "parameters": [
    {
      "name": "userId",
      "type": "number",
      "required": true,
      "label": "User Id",
      "description": "User ID to query"
    }
  ]
}

If Action is "Ban User" or "封禁用户", on success should return:
{
  "success": true,
  "sql": "UPDATE \`users\` SET \`status\` = 'banned' WHERE \`id\` = :userId",
  "parameters": [
    {
      "name": "userId",
      "type": "number",
      "required": true,
      "label": "User Id",
      "description": "User ID to ban"
    }
  ]
}

If table does not exist, should return:
{"success": false, "error": "Table users does not exist in Schema"}

## Task

Generate SQL statement and parameter definitions for Action "${name}".

**Important:**
1. If SQL contains named parameters (e.g., :userId), must define these parameters in the parameters array
2. Based on Action name and description, infer appropriate type, label, and description for each parameter
3. Parameter names must match the named parameters in SQL (without the colon)

**Now please return only JSON, format:**
- Success: {"success": true, "sql": "...", "parameters": [...]}
  - Failure: {"success": false, "error": "..."}**`;

  return prompt;
}
