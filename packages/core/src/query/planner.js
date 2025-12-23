import { buildPrompt } from '@sparkset/ai';
export class QueryPlanner {
  deps;
  constructor(deps = {}) {
    this.deps = deps;
  }
  async plan(question, datasourceId, limit) {
    this.deps.logger?.info(`[QueryPlanner] Input datasourceId: ${datasourceId}`);
    const ds =
      datasourceId ??
      (this.deps.chooseDatasource ? await this.deps.chooseDatasource(question) : null);
    this.deps.logger?.info(`[QueryPlanner] Using datasourceId: ${ds}`);
    if (!ds) throw new Error('No datasource available');
    if (this.deps.buildSql) {
      const sqlSnippet = await this.deps.buildSql(question, ds, limit);
      return {
        question,
        sql: [sqlSnippet],
        limit,
      };
    }
    if (!this.deps.aiClient) {
      throw new Error('AI client is required to generate SQL. Please configure an AI provider.');
    }
    if (!this.deps.getSchemas) {
      throw new Error(
        'Schema service is required to generate SQL. Please ensure schema service is configured.',
      );
    }
    try {
      const schemas = await this.deps.getSchemas(ds);
      this.deps.logger?.info(`[QueryPlanner] Datasource: ${ds}, Schema count: ${schemas.length}`);
      this.deps.logger?.info(
        `[QueryPlanner] Available tables: ${schemas.map((s) => s.tableName).join(', ')}`,
      );
      if (schemas.length === 0) {
        throw new Error(
          `No tables found in datasource ${ds}. Please sync the datasource schema first.`,
        );
      }
      const prompt = buildPrompt({
        question,
        schemas,
        limit,
      });
      this.deps.logger?.info(`[QueryPlanner] Question: ${question}`);
      this.deps.logger?.info(`[QueryPlanner] Prompt length: ${prompt.length} chars`);
      const sql = await this.deps.aiClient.generateSQL({
        prompt,
      });
      this.deps.logger?.info(`[QueryPlanner] Generated SQL: ${sql}`);
      return {
        question,
        sql: [
          {
            sql,
            datasourceId: ds,
          },
        ],
        limit,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate SQL using AI: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
//# sourceMappingURL=planner.js.map
