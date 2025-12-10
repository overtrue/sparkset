import { PlannedQuery, SqlSnippet } from './types';

export interface SchemaHint {
  datasourceId: number;
  tables: string[];
}

export interface PlannerDeps {
  chooseDatasource?: (question: string) => Promise<number | null>;
  buildSql?: (question: string, datasourceId: number) => Promise<SqlSnippet>;
}

/**
 * Extremely naive planner: select datasource (if provided) and wrap question into a stub SQL.
 * Replace with AI-powered planner later.
 */
export class QueryPlanner {
  constructor(private deps: PlannerDeps = {}) {}

  async plan(question: string, datasourceId?: number, limit?: number): Promise<PlannedQuery> {
    const ds =
      datasourceId ??
      (this.deps.chooseDatasource ? await this.deps.chooseDatasource(question) : null);
    if (!ds) throw new Error('No datasource available');
    const sqlSnippet =
      this.deps.buildSql?.(question, ds) ??
      Promise.resolve({
        sql: `SELECT * FROM orders${limit ? ` LIMIT ${limit}` : ''}; -- TODO: replace with AI generated SQL for ${question}`,
        datasourceId: ds,
      });
    return {
      question,
      sql: [await sqlSnippet],
      limit,
    };
  }
}
