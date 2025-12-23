export { SqlActionExecutor } from '../query/executor';
export class ActionRegistry {
  handlers = new Map();
  register(handler) {
    this.handlers.set(handler.type, handler);
  }
  get(type) {
    return this.handlers.get(type);
  }
}
export class ActionExecutor {
  registry;
  constructor(registry) {
    this.registry = registry;
  }
  async run(ctx) {
    const handler = this.registry.get(ctx.type);
    if (!handler) {
      return { success: false, error: new Error(`No handler for type ${ctx.type}`) };
    }
    return handler.execute(ctx);
  }
}
function replaceParameters(sql, parameters) {
  let result = sql;
  const paramNames = Object.keys(parameters).sort((a, b) => b.length - a.length);
  for (const paramName of paramNames) {
    const value = parameters[paramName];
    let escapedValue;
    if (value === null || value === undefined) {
      escapedValue = 'NULL';
    } else if (typeof value === 'string') {
      escapedValue = `'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      escapedValue = String(value);
    } else {
      escapedValue = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }
    const regex = new RegExp(`:${paramName}\\b`, 'g');
    result = result.replace(regex, escapedValue);
  }
  return result;
}
export const createSqlActionHandler = (deps) => {
  const handler = {
    type: 'sql',
    async execute(ctx) {
      const payload = ctx.payload;
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
      const sqlStrings = Array.isArray(payload.sql)
        ? typeof payload.sql[0] === 'string'
          ? payload.sql
          : payload.sql.map((s) => s.sql)
        : [payload.sql];
      const parameters = ctx.parameters || {};
      const replacedSqls = sqlStrings.map((sql) => replaceParameters(sql, parameters));
      const snippets = replacedSqls.map((sql) => ({
        sql,
        datasourceId: dsId,
      }));
      const execResult = await deps.executor.execute(snippets, { limit: payload.limit });
      return { success: true, data: execResult };
    },
  };
  return handler;
};
export const createEchoHandler = (type) => ({
  type,
  async execute(ctx) {
    return { success: true, data: ctx.payload };
  },
});
//# sourceMappingURL=index.js.map
