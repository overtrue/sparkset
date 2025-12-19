/*
|--------------------------------------------------------------------------
| Services provider
|--------------------------------------------------------------------------
|
| This provider registers all application services and their dependencies
| into the IoC container.
|
*/

import type { ApplicationService } from '@adonisjs/core/types';
import type { Database } from '@adonisjs/lucid/database';
import {
  ActionExecutor,
  ActionRegistry,
  QueryExecutor,
  SqlActionExecutor,
  createEchoHandler,
  createSqlActionHandler,
} from '@sparkset/core';
import { InMemoryDBClient, InMemorySchemaCacheRepository } from '../db/in-memory.js';
import { createLucidDBClientFactory } from '../db/lucid-db-client.js';
import { LucidActionRepository } from '../repositories/lucid_action_repository.js';
import { LucidAIProviderRepository } from '../repositories/lucid_ai_provider_repository.js';
import { LucidConversationRepository } from '../repositories/lucid_conversation_repository.js';
import { LucidDatasourceRepository } from '../repositories/lucid_datasource_repository.js';
import { LucidSchemaCacheRepository } from '../repositories/lucid_schema_cache_repository.js';
import { ActionService } from '../services/action_service.js';
import { AIProviderService } from '../services/ai_provider_service.js';
import { ConversationService } from '../services/conversation_service.js';
import { DatasourceService } from '../services/datasource_service.js';
import { QueryService } from '../services/query_service.js';
import { SchemaService } from '../services/schema_service.js';
import { DatasetService } from '../services/dataset_service.js';
import { ChartService } from '../services/chart_service.js';
import { ChartCompiler } from '../services/chart_compiler.js';
import '../types/container.js';

export default class ServicesProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  async register() {
    let datasourceService: DatasourceService;
    let actionService: ActionService;
    let conversationService: ConversationService;
    let schemaService: SchemaService;
    let aiProviderService: AIProviderService;
    let queryExecutor: QueryExecutor | undefined;
    let actionExecutor: ActionExecutor | undefined;

    // Get Lucid Database instance from container (lazy loading)
    let database: Database | null = null;
    let createDBClientFactory: ((config: any) => any) | null = null;
    try {
      database = (await this.app.container.make('lucid.db')) as Database;
      createDBClientFactory = createLucidDBClientFactory(database);
    } catch {
      // If Lucid is not available, database will be null
      // We'll use in-memory services in that case
    }

    if (database && createDBClientFactory) {
      // Use Lucid repositories
      datasourceService = new DatasourceService(new LucidDatasourceRepository());
      actionService = new ActionService(new LucidActionRepository());
      conversationService = new ConversationService(new LucidConversationRepository());
      aiProviderService = new AIProviderService(new LucidAIProviderRepository());
      schemaService = new SchemaService({
        schemaRepo: new LucidSchemaCacheRepository(),
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
      queryExecutor = new QueryExecutor({
        getDBClient: async (dsId) => {
          const ds = (await datasourceService.list()).find((d) => d.id === dsId);
          if (!ds) throw new Error('Datasource not found');
          // Use unique connection per datasource so the right pool is selected
          return createDBClientFactory({
            id: ds.id,
            name: ds.name,
            type: ds.type,
            host: ds.host,
            port: ds.port,
            username: ds.username,
            password: ds.password,
            database: ds.database,
          });
        },
        getDatasourceConfig: async (id) => {
          const ds = (await datasourceService.list()).find((d) => d.id === id);
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
        },
      });

      // Build action executor registry
      const getDBClient = async (datasourceId: number) => {
        const ds = (await datasourceService.list()).find((d) => d.id === datasourceId);
        if (!ds) throw new Error('Datasource not found');
        // Create or reuse a named connection for this datasource
        return createDBClientFactory({
          id: ds.id,
          name: ds.name,
          type: ds.type,
          host: ds.host,
          port: ds.port,
          username: ds.username,
          password: ds.password,
          database: ds.database,
        });
      };

      // Build action executor registry
      if (queryExecutor) {
        const registry = new ActionRegistry();
        const sqlActionExecutor = new SqlActionExecutor({
          getDBClient,
          getDatasourceConfig: async (id: number) => {
            const ds = (await datasourceService.list()).find((d) => d.id === id);
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
          },
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
        actionExecutor = new ActionExecutor(registry);
      }

      // Register services to container using both type and string identifier
      // This ensures the container can resolve dependencies by type
      this.app.container.singleton(DatasourceService, () => datasourceService);
      this.app.container.singleton('DatasourceService', () => datasourceService);
      this.app.container.singleton(ActionService, () => actionService);
      this.app.container.singleton('ActionService', () => actionService);
      this.app.container.singleton(ConversationService, () => conversationService);
      this.app.container.singleton('ConversationService', () => conversationService);
      this.app.container.singleton(SchemaService, () => schemaService);
      this.app.container.singleton('SchemaService', () => schemaService);
      this.app.container.singleton(AIProviderService, () => aiProviderService);
      this.app.container.singleton('AIProviderService', () => aiProviderService);
      this.app.container.singleton(QueryService, () => {
        return new QueryService({
          datasourceService,
          actionService,
          schemaService,
          aiProviderService,
          executor: queryExecutor,
          getDBClient,
          getDatasourceConfig: async (id: number) => {
            const ds = (await datasourceService.list()).find((d) => d.id === id);
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
          },
        });
      });
      this.app.container.bind('executors/query', () => queryExecutor);
      this.app.container.bind('executors/action', () => actionExecutor);
      // 注册 ActionExecutor 类型，以便依赖注入可以解析
      if (actionExecutor) {
        this.app.container.singleton(ActionExecutor, () => actionExecutor!);
      }

      // 注册 Chart 服务
      const chartCompiler = new ChartCompiler();
      const datasetService = new DatasetService(database, datasourceService);
      const chartService = new ChartService(datasetService, chartCompiler);

      this.app.container.singleton(DatasetService, () => datasetService);
      this.app.container.singleton('DatasetService', () => datasetService);
      this.app.container.singleton(ChartCompiler, () => chartCompiler);
      this.app.container.singleton('ChartCompiler', () => chartCompiler);
      this.app.container.singleton(ChartService, () => chartService);
      this.app.container.singleton('ChartService', () => chartService);

      return;
    } else {
      datasourceService = new DatasourceService();
      actionService = new ActionService();
      conversationService = new ConversationService();
      aiProviderService = new AIProviderService();
      schemaService = new SchemaService({
        schemaRepo: new InMemorySchemaCacheRepository(),
        getDBClient: async () => new InMemoryDBClient(),
        aiProviderService,
      });

      // Register in-memory services to container using both type and string identifier
      // This ensures the container can resolve dependencies by type
      this.app.container.singleton(DatasourceService, () => datasourceService);
      this.app.container.singleton('DatasourceService', () => datasourceService);
      this.app.container.singleton(ActionService, () => actionService);
      this.app.container.singleton('ActionService', () => actionService);
      this.app.container.singleton(ConversationService, () => conversationService);
      this.app.container.singleton('ConversationService', () => conversationService);
      this.app.container.singleton(SchemaService, () => schemaService);
      this.app.container.singleton('SchemaService', () => schemaService);
      this.app.container.singleton(AIProviderService, () => aiProviderService);
      this.app.container.singleton('AIProviderService', () => aiProviderService);
      this.app.container.singleton(QueryService, () => {
        return new QueryService({
          datasourceService,
          actionService,
          schemaService,
          aiProviderService,
          executor: queryExecutor,
          getDBClient: async () => new InMemoryDBClient(),
          getDatasourceConfig: async (id: number) => {
            const ds = (await datasourceService.list()).find((d) => d.id === id);
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
          },
        });
      });
      this.app.container.bind('executors/query', () => queryExecutor);
      this.app.container.bind('executors/action', () => actionExecutor);
      // 注册 ActionExecutor 类型，以便依赖注入可以解析
      if (actionExecutor) {
        this.app.container.singleton(ActionExecutor, () => actionExecutor!);
      }

      // 注册 Chart 服务（内存模式）
      const chartCompiler = new ChartCompiler();
      // 内存模式下，DatasetService 需要一个 mock database
      const mockDatabase = null as any;
      const datasetService = new DatasetService(mockDatabase, datasourceService);
      const chartService = new ChartService(datasetService, chartCompiler);

      this.app.container.singleton(DatasetService, () => datasetService);
      this.app.container.singleton('DatasetService', () => datasetService);
      this.app.container.singleton(ChartCompiler, () => chartCompiler);
      this.app.container.singleton('ChartCompiler', () => chartCompiler);
      this.app.container.singleton(ChartService, () => chartService);
      this.app.container.singleton('ChartService', () => chartService);
    }
  }

  async boot() {}

  async start() {}

  async ready() {}

  async shutdown() {}
}
