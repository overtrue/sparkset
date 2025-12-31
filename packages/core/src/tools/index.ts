import { QueryExecutor, SqlActionExecutor } from '../query/executor.js';
import { SqlSnippet } from '../query/types.js';

// Re-export SqlActionExecutor for convenience
export { SqlActionExecutor } from '../query/executor.js';

export type ActionType = 'sql' | 'api' | 'file' | string;

export interface ActionContext<P = unknown> {
  id: number;
  type: ActionType;
  payload: P;
  parameters?: unknown;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface ActionHandler {
  type: ActionType;
  execute: (ctx: ActionContext) => Promise<ActionResult>;
}

export class ActionRegistry {
  private handlers = new Map<ActionType, ActionHandler>();

  register(handler: ActionHandler) {
    this.handlers.set(handler.type, handler);
  }

  get(type: ActionType) {
    return this.handlers.get(type);
  }
}

export class ActionExecutor {
  constructor(private registry: ActionRegistry) {}

  async run(ctx: ActionContext): Promise<ActionResult> {
    const handler = this.registry.get(ctx.type);
    if (!handler) {
      return { success: false, error: new Error(`No handler for type ${ctx.type}`) };
    }
    return handler.execute(ctx);
  }
}

// SQL tool
export interface SqlActionPayload {
  sql: string | string[] | SqlSnippet[];
  datasourceId?: number;
  limit?: number;
}

/**
 * 替换 SQL 中的命名参数（:paramName）为实际值
 */
function replaceParameters(sql: string, parameters: Record<string, unknown>): string {
  let result = sql;
  // 按参数名长度降序排序，避免短参数名被长参数名的一部分替换
  const paramNames = Object.keys(parameters).sort((a, b) => b.length - a.length);

  for (const paramName of paramNames) {
    const value = parameters[paramName];
    // 转义参数值，防止 SQL 注入
    let escapedValue: string;
    if (value === null || value === undefined) {
      escapedValue = 'NULL';
    } else if (typeof value === 'string') {
      // 转义单引号并包裹在引号中
      escapedValue = `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      escapedValue = String(value);
    } else {
      // 其他类型转为 JSON 字符串
      escapedValue = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    // 使用单词边界确保只替换完整的参数名
    const regex = new RegExp(`:${paramName}\\b`, 'g');
    result = result.replace(regex, escapedValue);
  }

  return result;
}

export const createSqlActionHandler = (deps: {
  executor: QueryExecutor | SqlActionExecutor;
  defaultDatasourceId?: number | (() => Promise<number | undefined>);
}) => {
  const handler: ActionHandler = {
    type: 'sql',
    async execute(ctx: ActionContext) {
      const payload = ctx.payload as SqlActionPayload;
      let dsId = payload.datasourceId;
      if (!dsId) {
        if (typeof deps.defaultDatasourceId === 'function') {
          dsId = await deps.defaultDatasourceId();
        } else {
          dsId = deps.defaultDatasourceId;
        }
      }
      if (!dsId)
        return { success: false, error: new Error('Datasource is required for SQL action') };

      // 处理 SQL（可能是字符串或数组）
      const sqlStrings = Array.isArray(payload.sql)
        ? typeof payload.sql[0] === 'string'
          ? (payload.sql as string[])
          : (payload.sql as SqlSnippet[]).map((s) => s.sql)
        : [payload.sql];

      // 替换参数
      const parameters = (ctx.parameters as Record<string, unknown>) || {};
      const replacedSqls = sqlStrings.map((sql) => replaceParameters(sql, parameters));

      const snippets: SqlSnippet[] = replacedSqls.map((sql) => ({
        sql,
        datasourceId: dsId,
      }));

      const execResult = await deps.executor.execute(snippets, { limit: payload.limit });
      return { success: true, data: execResult };
    },
  };
  return handler;
};

// Fallback stub tool for unimplemented types
export const createEchoHandler = (type: ActionType): ActionHandler => ({
  type,
  async execute(ctx) {
    return { success: true, data: ctx.payload };
  },
});
