import { AIClient, VercelAIClient } from '../ai/index.js';
import { QueryExecutor, QueryPlanner } from '@sparkset/core';
import type { DataSource } from '../models/types';
import { Exception } from '@adonisjs/core/exceptions';
import {
  ConfigurationException,
  DatabaseException,
  ExternalServiceException,
  RateLimitException,
  ValidationException,
} from '#exceptions/app_exceptions.js';
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
  conversationId?: number;
}

export type QueryResultRow = Record<string, unknown>;

export interface QueryResponse {
  sql: string;
  rows: QueryResultRow[];
  summary?: string;
  rowCount?: number;
  hasResult?: boolean;
  datasource?: DataSource;
  datasourceId?: number;
  aiProviderId?: number;
  limit?: number;
  conversationId?: number;
}

const CONFIGURATION_MESSAGE_PATTERNS = [
  /no tables found/i,
  /schema.*not synced/i,
  /no schema/i,
  /not configured|no datasource|selected datasource|no ai provider|selected ai provider/i,
  /please configure/i,
];

const RATE_LIMIT_MESSAGE_PATTERNS = /rate\s*limit|too\s*many\s*requests|retry\s+(after|in)|429/i;
const DATABASE_MESSAGE_PATTERNS =
  /table.*does not exist|unknown column|sql syntax|doesn't exist|不存在|不合法|access denied|denied for user|数据库访问被拒绝/i;
const READONLY_MESSAGE_PATTERNS =
  /only read-only queries are allowed|write operations are blocked|multi-statement queries are not allowed/i;
const EXTERNAL_SERVICE_PATTERNS =
  /connect|connection|timeout|timed out|network|unreachable|econnreset|econnrefused/i;

const matchAny = (message: string, patterns: RegExp[]) =>
  patterns.some((pattern) => pattern.test(message));

/**
 * QueryService integrates planner + executor to run real queries.
 */
export class QueryService {
  constructor(
    private deps: {
      datasourceService: DatasourceService;
      schemaService: SchemaService;
      aiProviderService: AIProviderService;
      planner?: QueryPlanner;
      executor: QueryExecutor;
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
  private async createAIClient(providerId?: number): Promise<{
    aiClient: AIClient;
    aiProviderId: number;
  }> {
    const providers = await this.deps.aiProviderService.list();

    // 如果指定了 provider ID，优先使用指定 Provider
    let provider = providerId ? providers.find((p) => p.id === providerId) : null;

    if (providerId && !provider) {
      throw new ValidationException(
        `Selected AI provider (ID: ${providerId}) not found. Please select a valid AI provider.`,
      );
    }

    // 如果未指定，则尝试使用默认 provider
    if (!provider) {
      provider = providers.find((p) => p.isDefault);
    }

    if (!provider) {
      throw new ConfigurationException(
        'No AI provider available. Please configure an AI provider first.',
      );
    }

    this.deps.logger?.info(
      `Creating AI client with provider: ${provider.name} (${provider.defaultModel || 'default model'})`,
    );

    return {
      aiClient: new VercelAIClient({
        defaultModel: provider.defaultModel || 'gpt-4o-mini',
        defaultProvider: provider.type,
        defaultApiKey: provider.apiKey,
        defaultBaseURL: provider.baseURL,
        logger: this.toPlannerLogger(this.deps.logger),
      }),
      aiProviderId: provider.id,
    };
  }

  async run(input: QueryRequest): Promise<QueryResponse> {
    // 动态创建 AI Client
    const { aiClient, aiProviderId } = await this.createAIClient(input.aiProvider);

    // Plan
    // 如果未指定数据源，使用默认数据源
    const datasources = await this.deps.datasourceService.list();
    const explicitDatasourceId = input.datasource
      ? datasources.find((datasource) => datasource.id === input.datasource)?.id
      : undefined;

    if (input.datasource && !explicitDatasourceId) {
      throw new ValidationException(
        `Selected datasource (ID: ${input.datasource}) not found. Please select a valid datasource.`,
      );
    }

    const datasourceId =
      explicitDatasourceId ??
      datasources.find((datasource) => datasource.isDefault)?.id ??
      datasources[0]?.id ??
      undefined;

    if (!datasourceId) {
      throw new ConfigurationException(
        'No datasource configured. Please configure a datasource before querying.',
      );
    }

    const planner =
      this.deps.planner ??
      new QueryPlanner({
        chooseDatasource: async () => {
          return datasourceId;
        },
        getSchemas: async (datasourceId: number) => {
          return this.deps.schemaService.list(datasourceId);
        },
        aiClient,
        logger: this.toPlannerLogger(this.deps.logger),
      });

    let plan: Awaited<ReturnType<QueryPlanner['plan']>>;
    try {
      plan = await planner.plan(input.question, datasourceId, input.limit);
    } catch (error) {
      this.mapPlannerError(error);
    }

    let execResult: Awaited<ReturnType<QueryExecutor['execute']>>;
    try {
      execResult = await this.deps.executor.execute(plan.sql, { limit: input.limit });
    } catch (error) {
      this.mapExecutorError(error);
    }

    return {
      sql: plan.sql.map((s) => s.sql).join('\n'),
      rows: execResult.rows as QueryResultRow[],
      summary: execResult.summary,
      rowCount: Array.isArray(execResult.rows) ? execResult.rows.length : 0,
      hasResult: Array.isArray(execResult.rows) ? execResult.rows.length > 0 : false,
      datasourceId: datasourceId ?? undefined,
      aiProviderId,
      limit: input.limit,
    };
  }

  private mapPlannerError(error: unknown): never {
    if (error instanceof Exception) {
      throw error;
    }

    const message = this.getErrorMessage(error);

    if (RATE_LIMIT_MESSAGE_PATTERNS.test(message)) {
      throw new RateLimitException(message);
    }

    if (matchAny(message, CONFIGURATION_MESSAGE_PATTERNS)) {
      throw new ConfigurationException(message);
    }

    throw new ExternalServiceException('AI provider', message);
  }

  private mapExecutorError(error: unknown): never {
    if (error instanceof Exception) {
      throw error;
    }

    const message = this.getErrorMessage(error);

    if (READONLY_MESSAGE_PATTERNS.test(message)) {
      throw new ValidationException(message);
    }

    if (RATE_LIMIT_MESSAGE_PATTERNS.test(message)) {
      throw new RateLimitException(message);
    }

    if (matchAny(message, CONFIGURATION_MESSAGE_PATTERNS)) {
      throw new ConfigurationException(message);
    }

    if (matchAny(message, [EXTERNAL_SERVICE_PATTERNS])) {
      throw new ExternalServiceException('Datasource', message);
    }

    if (matchAny(message, [DATABASE_MESSAGE_PATTERNS])) {
      throw new DatabaseException(message);
    }

    throw new ExternalServiceException('Datasource', message);
  }

  private getErrorMessage(error: unknown): string {
    if (!error) {
      return '';
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'number' || typeof error === 'boolean') {
      return String(error);
    }

    if (typeof error === 'object') {
      const typedError = error as { message?: unknown; error?: unknown };
      if (typeof typedError.message === 'string' && typedError.message.trim()) {
        return typedError.message;
      }
      if (typeof typedError.error === 'string' && typedError.error.trim()) {
        return typedError.error;
      }
      try {
        return JSON.stringify(error) || 'Unknown query error';
      } catch {
        return 'Unknown query error';
      }
    }

    if (typeof error === 'number' || typeof error === 'boolean') {
      return String(error);
    }

    return typeof error === 'string' ? error : 'Unknown query error';
  }
}
