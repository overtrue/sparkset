import { AIClient, VercelAIClient } from '@sparkset/ai';
import { DBClient, DataSourceConfig, QueryExecutor, QueryPlanner } from '@sparkset/core';
import type { DataSource } from '../models/types';
import { ActionService } from '../services/action_service';
import { AIProviderService } from '../services/ai_provider_service';
import { DatasourceService } from '../services/datasource_service';
import { SchemaService } from '../services/schema_service';

interface AIClientLogger {
  info: (msg: string, ...args: unknown[]) => void;
  warn: (msg: string, ...args: unknown[]) => void;
  error: (msg: string | Error, ...args: unknown[]) => void;
}

interface LogLike {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface QueryRequest {
  question: string;
  datasource?: number;
  action?: number;
  limit?: number;
  aiProvider?: number;
}

export type QueryResultRow = Record<string, unknown>;

export interface QueryResponse {
  sql: string;
  rows: QueryResultRow[];
  summary?: string;
  datasource?: DataSource;
  datasourceId?: number;
  conversationId?: number;
}

/**
 * QueryService integrates planner + executor. If executor is provided, returns real DB rows; otherwise stub.
 */
export class QueryService {
  constructor(
    private deps: {
      datasourceService: DatasourceService;
      actionService: ActionService;
      schemaService: SchemaService;
      aiProviderService: AIProviderService;
      planner?: QueryPlanner;
      executor?: QueryExecutor;
      getDBClient?: (datasourceId: number) => Promise<DBClient>;
      getDatasourceConfig?: (datasourceId: number) => Promise<DataSourceConfig>;
      logger?: LogLike;
    },
  ) {}

  private toPlannerLogger(logger?: LogLike): AIClientLogger | undefined {
    if (!logger) return undefined;
    return {
      info: (msg, ...args) => logger.info(msg, ...args),
      warn: (msg, ...args) => logger.warn(msg, ...args),
      error: (msg, ...args) => {
        if (msg instanceof Error) {
          logger.error(msg);
          return;
        }
        logger.error(msg, ...args);
      },
    };
  }

  /**
   * 根据 provider ID 创建 AI Client
   */
  private async createAIClient(providerId?: number): Promise<AIClient> {
    const providers = await this.deps.aiProviderService.list();

    // 如果指定了 provider ID，使用指定的 provider
    let provider = providerId ? providers.find((p) => p.id === providerId) : null;

    // 如果没有指定或找不到，使用默认的 provider
    if (!provider) {
      provider = providers.find((p) => p.isDefault);
    }

    if (!provider) {
      throw new Error('No AI provider available. Please configure an AI provider first.');
    }

    this.deps.logger?.info(
      `Creating AI client with provider: ${provider.name} (${provider.defaultModel || 'default model'})`,
    );

    return new VercelAIClient({
      defaultModel: provider.defaultModel || 'gpt-4o-mini',
      defaultProvider: provider.type,
      defaultApiKey: provider.apiKey,
      defaultBaseURL: provider.baseURL,
      logger: this.toPlannerLogger(this.deps.logger),
    });
  }

  async run(input: QueryRequest): Promise<QueryResponse> {
    // 动态创建 AI Client
    const aiClient = await this.createAIClient(input.aiProvider);

    // Plan
    // 如果未指定数据源，使用默认数据源
    const datasourceId =
      input.datasource ??
      (await this.deps.datasourceService.list()).find((d) => d.isDefault)?.id ??
      undefined;

    const planner =
      this.deps.planner ??
      new QueryPlanner({
        chooseDatasource: async () => {
          const list = await this.deps.datasourceService.list();
          return list.find((d) => d.isDefault)?.id ?? list[0]?.id ?? null;
        },
        getSchemas: async (datasourceId: number) => {
          return this.deps.schemaService.list(datasourceId);
        },
        aiClient,
        logger: this.toPlannerLogger(this.deps.logger),
      });

    const plan = await planner.plan(input.question, datasourceId, input.limit);

    // If executor wired, run real queries
    if (this.deps.executor) {
      const execResult = await this.deps.executor.execute(plan.sql, { limit: input.limit });
      return {
        sql: plan.sql.map((s) => s.sql).join('\n'),
        rows: execResult.rows as QueryResultRow[],
        summary: execResult.summary,
        datasourceId: datasourceId ?? undefined,
      };
    }

    // Stub fallback (当没有 executor 时使用)
    // 返回空结果，提示用户配置 executor
    const limitedRows: QueryResultRow[] = [];
    return {
      sql: plan.sql.map((s) => s.sql).join('\n'),
      rows: limitedRows,
      summary: '查询执行器未配置。请确保已正确配置数据源和查询执行器。',
      datasourceId: datasourceId ?? undefined,
    };
  }
}
