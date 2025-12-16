import { ActionExecutor, QueryExecutor } from '@sparkset/core';
import { FastifyInstance } from 'fastify';
import { AIProvidersController } from '../app/Controllers/Http/AIProvidersController';
import { ActionsController } from '../app/Controllers/Http/ActionsController';
import { ConversationsController } from '../app/Controllers/Http/ConversationsController';
import { DatasourcesController } from '../app/Controllers/Http/DatasourcesController';
import { HealthController } from '../app/Controllers/Http/HealthController';
import { QueriesController } from '../app/Controllers/Http/QueriesController';
import { ActionService } from '../app/services/actionService';
import { AIProviderService } from '../app/services/aiProviderService';
import { ConversationService } from '../app/services/conversationService';
import { DatasourceService } from '../app/services/datasourceService';
import { QueryService } from '../app/services/queryService';
import { SchemaService } from '../app/services/schemaService';

const healthController = new HealthController();
const actionsController = new ActionsController(new ActionService());
const conversationsController = new ConversationsController(new ConversationService());

interface RouteDeps {
  datasourceService: DatasourceService;
  schemaService: SchemaService;
  aiProviderService: AIProviderService;
  actionService?: ActionService;
  conversationService?: ConversationService;
  queryService?: QueryService;
  queryExecutor?: QueryExecutor;
  actionExecutor?: ActionExecutor;
  getDBClient?: (datasourceId: number) => Promise<unknown>;
  getDatasourceConfig?: (datasourceId: number) => Promise<unknown>;
  logger?: {
    info: (msg: string, ...args: unknown[]) => void;
    warn: (msg: string, ...args: unknown[]) => void;
    error: (msg: string | Error, ...args: unknown[]) => void;
  };
}

export const registerRoutes = (app: FastifyInstance, deps: RouteDeps) => {
  app.get('/health', (req, reply) => healthController.handle(req, reply));

  // bind datasource controller per request to inject service
  app.get('/datasources', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).index(req, reply),
  );
  app.post('/datasources', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).store(req, reply),
  );
  // 更具体的路由必须在更通用的路由之前注册（Fastify 按注册顺序匹配）
  app.post('/datasources/:id/sync', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).sync(req, reply),
  );
  app.post('/datasources/:id/semantic-descriptions', (req, reply) =>
    new DatasourcesController(
      deps.datasourceService,
      deps.schemaService,
    ).generateSemanticDescriptions(req, reply),
  );
  app.get('/datasources/:id/schema', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).schema(req, reply),
  );
  app.put('/datasources/:id/tables/:tableId', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).updateTableMetadata(
      req,
      reply,
    ),
  );
  app.put('/datasources/:id/columns/:columnId', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).updateColumnMetadata(
      req,
      reply,
    ),
  );
  app.post('/datasources/:id/set-default', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).setDefault(req, reply),
  );
  // 通用的 /datasources/:id 路由放在最后
  app.get('/datasources/:id', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).show(req, reply),
  );
  app.put('/datasources/:id', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).update(req, reply),
  );
  app.delete('/datasources/:id', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).destroy(req, reply),
  );

  const actionSvc = deps.actionService ?? actionsController['service'];
  const conversationSvc = deps.conversationService ?? conversationsController['service'];

  // 创建 ActionsController 的辅助函数
  const createActionsController = () =>
    new ActionsController(
      actionSvc,
      deps.actionExecutor,
      deps.schemaService,
      deps.aiProviderService,
    );

  app.get('/actions', (req, reply) => createActionsController().index(req, reply));
  app.get('/actions/:id', (req, reply) => createActionsController().show(req, reply));
  app.post('/actions', (req, reply) => createActionsController().store(req, reply));
  // 更具体的路由必须在更通用的路由之前注册
  app.post('/actions/generate-sql', (req, reply) =>
    createActionsController().generateSQL(req, reply),
  );
  app.put('/actions/:id', (req, reply) => createActionsController().update(req, reply));
  app.delete('/actions/:id', (req, reply) => createActionsController().destroy(req, reply));
  app.post('/actions/:id/execute', (req, reply) => createActionsController().execute(req, reply));

  app.post('/query', async (req, reply) => {
    try {
      return await new QueriesController(
        deps.queryService ??
          new QueryService({
            datasourceService: deps.datasourceService,
            actionService: actionSvc,
            schemaService: deps.schemaService,
            aiProviderService: deps.aiProviderService,
            executor: deps.queryExecutor,
            getDBClient: deps.getDBClient,
            getDatasourceConfig: deps.getDatasourceConfig,
            logger: deps.logger,
          }),
        conversationSvc,
      ).run(req, reply);
    } catch (error) {
      req.log.error(error, 'Query endpoint error');
      return reply.code(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/conversations', (req, reply) =>
    new ConversationsController(conversationSvc).index(req, reply),
  );
  app.get('/conversations/:id', (req, reply) =>
    new ConversationsController(conversationSvc).show(req, reply),
  );
  app.post('/conversations', (req, reply) =>
    new ConversationsController(conversationSvc).store(req, reply),
  );
  app.post('/conversations/:id/messages', (req, reply) =>
    new ConversationsController(conversationSvc).appendMessage(req, reply),
  );

  // AI Provider routes
  app.get('/ai-providers', (req, reply) =>
    new AIProvidersController(deps.aiProviderService).index(req, reply),
  );
  app.post('/ai-providers', (req, reply) =>
    new AIProvidersController(deps.aiProviderService).store(req, reply),
  );
  app.post('/ai-providers/:id/set-default', (req, reply) =>
    new AIProvidersController(deps.aiProviderService).setDefault(req, reply),
  );
  app.put('/ai-providers/:id', (req, reply) =>
    new AIProvidersController(deps.aiProviderService).update(req, reply),
  );
  app.delete('/ai-providers/:id', (req, reply) =>
    new AIProvidersController(deps.aiProviderService).destroy(req, reply),
  );
};
