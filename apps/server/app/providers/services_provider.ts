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
import { Database } from '@adonisjs/lucid/database';
import { ActionExecutor } from '@sparkset/core';
import { createRepositories } from './repository_factory.js';
import { createServices, type Services } from './service_factory.js';
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
import { BotProcessor } from '../services/bot_processor.js';
import '../types/container.js';

export default class ServicesProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  async register() {
    // Try to get Lucid Database instance from container
    let database: Database | null = null;
    try {
      database = (await this.app.container.make('lucid.db')) as Database;
    } catch {
      // If Lucid is not available, database will be null
      // We'll use in-memory services in that case
    }

    // Create repositories and services using factory functions
    const repositories = createRepositories(database);
    const services = createServices({ database, repositories });

    // Register Database instance for dependency injection
    if (database) {
      this.app.container.singleton(Database, () => database!);
      this.app.container.singleton('lucid.db', () => database!);
    }

    // Register all services to container
    this.registerServices(services);
  }

  /**
   * Register all services to the IoC container
   */
  private registerServices(services: Services) {
    // Datasource Service
    this.app.container.singleton(DatasourceService, () => services.datasource);
    this.app.container.singleton('DatasourceService', () => services.datasource);

    // Action Service
    this.app.container.singleton(ActionService, () => services.action);
    this.app.container.singleton('ActionService', () => services.action);

    // Conversation Service
    this.app.container.singleton(ConversationService, () => services.conversation);
    this.app.container.singleton('ConversationService', () => services.conversation);

    // Schema Service
    this.app.container.singleton(SchemaService, () => services.schema);
    this.app.container.singleton('SchemaService', () => services.schema);

    // AI Provider Service
    this.app.container.singleton(AIProviderService, () => services.aiProvider);
    this.app.container.singleton('AIProviderService', () => services.aiProvider);

    // Query Service
    this.app.container.singleton(QueryService, () => services.query);

    // Dataset Service
    this.app.container.singleton(DatasetService, () => services.dataset);
    this.app.container.singleton('DatasetService', () => services.dataset);

    // Chart Services
    this.app.container.singleton(ChartCompiler, () => services.chartCompiler);
    this.app.container.singleton('ChartCompiler', () => services.chartCompiler);
    this.app.container.singleton(ChartService, () => services.chart);
    this.app.container.singleton('ChartService', () => services.chart);

    // Dashboard Services
    this.app.container.singleton(DashboardService, () => services.dashboard);
    this.app.container.singleton('DashboardService', () => services.dashboard);
    this.app.container.singleton(DashboardWidgetService, () => services.dashboardWidget);
    this.app.container.singleton('DashboardWidgetService', () => services.dashboardWidget);

    // Executors
    this.app.container.bind('executors/query', () => services.queryExecutor);
    this.app.container.bind('executors/action', () => services.actionExecutor);
    if (services.actionExecutor) {
      this.app.container.singleton(ActionExecutor, () => services.actionExecutor!);
    }

    // Bot Processor (Phase 2.6)
    if (services.botProcessor) {
      this.app.container.singleton(BotProcessor, () => services.botProcessor!);
      this.app.container.singleton('BotProcessor', () => services.botProcessor!);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async boot() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async start() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async ready() {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async shutdown() {}
}
