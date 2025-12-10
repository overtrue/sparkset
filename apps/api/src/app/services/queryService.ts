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
 * QueryService integrates planner + executor. If executor is provided, returns real DB rows; otherwise stub.
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

    // If executor wired, run real queries
    if (this.deps.executor) {
      const execResult = await this.deps.executor.execute(plan.sql);
      return {
        sql: plan.sql.map((s) => s.sql).join('\n'),
        rows: execResult.rows as QueryResultRow[],
        summary: execResult.summary,
      };
    }

    // Stub fallback
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
