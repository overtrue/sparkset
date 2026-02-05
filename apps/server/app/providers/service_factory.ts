/**
 * Service Factory
 *
 * Factory functions for creating services with their dependencies.
 * This centralizes service creation logic and reduces code duplication.
 */

import type { Database } from '@adonisjs/lucid/database';
import {
  ActionExecutor,
  ActionRegistry,
  QueryExecutor,
  SqlActionExecutor,
  createEchoHandler,
  createSqlActionHandler,
  DBClient,
  DataSourceConfig,
} from '@sparkset/core';
import type { Repositories } from './repository_factory.js';
import { createLucidDBClientFactory } from '../db/lucid-db-client.js';
import { ActionService } from '../services/action_service.js';
import { AIProviderService } from '../services/ai_provider_service.js';
import { ConversationService } from '../services/conversation_service.js';
import { DatasourceService } from '../services/datasource_service.js';
import { QueryService } from '../services/query_service.js';
import { SchemaService } from '../services/schema_service.js';
import { DatasetService } from '../services/dataset_service.js';
import { ChartService } from '../services/chart_service.js';
import { ChartCompiler } from '../services/chart_compiler.js';
import { DashboardService } from '../services/dashboard_service.js';
import { DashboardWidgetService } from '../services/dashboard_widget_service.js';
import { BotProcessor, createBotProcessor } from '../services/bot_processor.js';
import { BotQueryProcessor } from '../services/query_processor.js';
import { BotActionExecutor } from '../services/action_executor.js';
import { createParameterExtractor } from '../services/parameter_extractor.js';
import { createConversationTracker } from '../services/conversation_tracker.js';

/**
 * All services needed by the application
 */
export interface Services {
  datasource: DatasourceService;
  action: ActionService;
  conversation: ConversationService;
  schema: SchemaService;
  aiProvider: AIProviderService;
  query: QueryService;
  dataset: DatasetService;
  chart: ChartService;
  chartCompiler: ChartCompiler;
  dashboard: DashboardService;
  dashboardWidget: DashboardWidgetService;
  queryExecutor: QueryExecutor;
  actionExecutor: ActionExecutor;
  botProcessor: BotProcessor;
}

/**
 * Options for creating services
 */
export interface ServiceFactoryOptions {
  database: Database;
  repositories: Repositories;
}

/**
 * Create all services with their dependencies
 */
export function createServices(options: ServiceFactoryOptions): Services {
  const { database, repositories } = options;

  // Create base services
  const datasourceService = new DatasourceService(repositories.datasource);
  const actionService = new ActionService(repositories.action);
  const conversationService = new ConversationService(repositories.conversation);
  const aiProviderService = new AIProviderService(repositories.aiProvider);

  // Create DB client factory
  const createDBClientFactory = createLucidDBClientFactory(database);

  // Helper to get datasource config by ID
  const getDatasourceConfig = async (id: number): Promise<DataSourceConfig> => {
    const ds = await datasourceService.get(id);
    if (!ds) throw new Error('Datasource not found');
    return {
      id: ds.id,
      name: ds.name,
      type: ds.type,
      host: ds.host,
      port: ds.port,
      username: ds.username,
      password: ds.password,
      database: ds.database,
    };
  };

  // Helper to get DB client by datasource ID
  const getDBClient = async (datasourceId: number): Promise<DBClient> => {
    const config = await getDatasourceConfig(datasourceId);
    return createDBClientFactory(config);
  };

  // Create schema service
  const schemaService = new SchemaService({
    schemaRepo: repositories.schemaCache,
    getDBClient: async (ds) =>
      createDBClientFactory({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        host: ds.host,
        port: ds.port,
        username: ds.username,
        password: ds.password,
        database: ds.database,
      }),
    aiProviderService,
  });

  // Create executors (query always available, actions require database)
  const queryExecutor = new QueryExecutor({
    getDBClient,
    getDatasourceConfig,
  });

  // Build action executor registry
  const registry = new ActionRegistry();
  const sqlActionExecutor = new SqlActionExecutor({
    getDBClient,
    getDatasourceConfig,
  });
  registry.register(
    createSqlActionHandler({
      executor: sqlActionExecutor,
      defaultDatasourceId: async () => {
        const list = await datasourceService.list();
        return list.find((d) => d.isDefault)?.id;
      },
    }),
  );
  registry.register(createEchoHandler('api'));
  registry.register(createEchoHandler('file'));
  const actionExecutor = new ActionExecutor(registry);

  // Create query service
  const queryService = new QueryService({
    datasourceService,
    schemaService,
    aiProviderService,
    executor: queryExecutor,
  });

  // Create chart services
  const chartCompiler = new ChartCompiler();
  const datasetService = new DatasetService(database, datasourceService);
  const chartService = new ChartService(datasetService, chartCompiler);

  // Create dashboard services
  const dashboardService = new DashboardService();
  const dashboardWidgetService = new DashboardWidgetService();

  // Create bot processor (Phase 2.6: Full integration)
  const botQueryProcessor = new BotQueryProcessor(queryService);
  const botActionExecutor = new BotActionExecutor(actionService, datasetService, actionExecutor);
  const parameterExtractor = createParameterExtractor(repositories.aiProvider);
  const conversationTracker = createConversationTracker(repositories.conversation);

  const botProcessor = createBotProcessor(
    botQueryProcessor,
    botActionExecutor,
    repositories.aiProvider,
    parameterExtractor,
    conversationTracker,
  );

  return {
    datasource: datasourceService,
    action: actionService,
    conversation: conversationService,
    schema: schemaService,
    aiProvider: aiProviderService,
    query: queryService,
    dataset: datasetService,
    chart: chartService,
    chartCompiler,
    dashboard: dashboardService,
    dashboardWidget: dashboardWidgetService,
    queryExecutor,
    actionExecutor,
    botProcessor,
  };
}
