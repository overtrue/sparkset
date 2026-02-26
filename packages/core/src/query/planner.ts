import { AIClient, buildPrompt } from '../ai/index';
import { TableSchema } from '../db/types';
import { PlannedQuery, SqlSnippet } from './types';

export interface SchemaHint {
  datasourceId: number;
  tables: string[];
}

export interface PlannerDeps {
  chooseDatasource?: (question: string) => Promise<number | null>;
  buildSql?: (question: string, datasourceId: number, limit?: number) => Promise<SqlSnippet>;
  getSchemas?: (datasourceId: number) => Promise<TableSchema[]>;
  aiClient?: AIClient;
  logger?: {
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string | Error, ...args: unknown[]) => void;
  };
}

/**
 * Query planner that uses AI to generate SQL from natural language questions.
 * Requires AI client and schema information to be provided via dependencies.
 */
export class QueryPlanner {
  constructor(private deps: PlannerDeps = {}) {}

  async plan(question: string, datasourceId?: number, limit?: number): Promise<PlannedQuery> {
    this.deps.logger?.info(`[QueryPlanner] Input datasourceId: ${datasourceId}`);

    const ds =
      datasourceId ??
      (this.deps.chooseDatasource ? await this.deps.chooseDatasource(question) : null);

    this.deps.logger?.info(`[QueryPlanner] Using datasourceId: ${ds}`);
    if (!ds) throw new Error('No datasource available');

    // 如果提供了 buildSql 函数，使用它（可能是自定义实现）
    if (this.deps.buildSql) {
      const sqlSnippet = await this.deps.buildSql(question, ds, limit);
      return {
        question,
        sql: [sqlSnippet],
        limit,
      };
    }

    // 使用 AI 生成 SQL
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
