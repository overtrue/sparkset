import { DBClient, DataSourceConfig, QueryResult } from '@sparkline/db';
import { SqlSnippet, ExecutionResult } from './types';

export interface ExecutorDeps {
  getDBClient: (datasourceId: number) => Promise<DBClient>;
  getDatasourceConfig: (datasourceId: number) => Promise<DataSourceConfig>;
}

export class QueryExecutor {
  constructor(private deps: ExecutorDeps) {}

  async execute(sqlSnippets: SqlSnippet[]): Promise<ExecutionResult> {
    const allRows: unknown[] = [];

    for (const snippet of sqlSnippets) {
      const client = await this.deps.getDBClient(snippet.datasourceId);
      const cfg = await this.deps.getDatasourceConfig(snippet.datasourceId);
      const result: QueryResult = await client.query(cfg, snippet.sql);
      allRows.push(...result.rows);
    }

    return { rows: allRows, sql: sqlSnippets, summary: 'Executed queries' };
  }
}
