import { DataSource } from '@sparkline/models';
import { QueryPlanner, QueryExecutor } from '@sparkline/core';
import { DatasourceService } from '../services/datasourceService';
import { ActionService } from '../services/actionService';
import { DBClient, DataSourceConfig } from '@sparkline/db';

export interface QueryRequest {
  question: string;
  datasource?: number;
  action?: number;
  limit?: number;
}

export type QueryResultRow = Record<string, unknown>;

export interface QueryResponse {
  sql: string;
  rows: QueryResultRow[];
  summary?: string;
  datasource?: DataSource;
}

/**
 * QueryService now integrates planner + executor; still returns canned rows when executor not provided.
 */
export class QueryService {
  constructor(
    private deps: {
      datasourceService: DatasourceService;
      actionService: ActionService;
      planner?: QueryPlanner;
      executor?: QueryExecutor;
      getDBClient?: (datasourceId: number) => Promise<DBClient>;
      getDatasourceConfig?: (datasourceId: number) => Promise<DataSourceConfig>;
    },
  ) {}

  async run(input: QueryRequest): Promise<QueryResponse> {
    // Plan
    const planner =
      this.deps.planner ??
      new QueryPlanner({
        chooseDatasource: async () => {
          const list = await this.deps.datasourceService.list();
          return list[0]?.id ?? null;
        },
        buildSql: async (q, ds) => ({ sql: `-- TODO: SQL for ${q}`, datasourceId: ds }),
      });

    const plan = await planner.plan(input.question, input.datasource);

    // Execute (fallback to stub if executor not provided)
    if (this.deps.executor && this.deps.getDBClient && this.deps.getDatasourceConfig) {
      const result = await this.deps.executor.execute(plan.sql);
      return {
        sql: plan.sql.map((s) => s.sql).join('\n'),
        rows: result.rows as QueryResultRow[],
        summary: result.summary,
      };
    }

    const rows: QueryResultRow[] = [
      { user: 'Alice', region: '杭州', orders: 34, refundRate: '2.1%' },
      { user: 'Bob', region: '上海', orders: 21, refundRate: '1.5%' },
      { user: 'Carol', region: '北京', orders: 18, refundRate: '3.2%' },
    ];
    const limitedRows = input.limit ? rows.slice(0, input.limit) : rows;
    return {
      sql: plan.sql.map((s) => s.sql).join('\n'),
      rows: limitedRows,
      summary: 'Stubbed query response; replace with AI + executor pipeline.',
    };
  }
}
