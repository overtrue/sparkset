import { FastifyInstance } from 'fastify';
import { ActionsController } from '../app/Controllers/Http/ActionsController';
import { DatasourcesController } from '../app/Controllers/Http/DatasourcesController';
import { HealthController } from '../app/Controllers/Http/HealthController';
import { QueriesController } from '../app/Controllers/Http/QueriesController';
import { DatasourceService } from '../app/services/datasourceService';
import { SchemaService } from '../app/services/schemaService';
import { ActionService } from '../app/services/actionService';
import { ConversationsController } from '../app/Controllers/Http/ConversationsController';
import { ConversationService } from '../app/services/conversationService';
import { QueryService } from '../app/services/queryService';
import { QueryPlanner, QueryExecutor } from '@sparkline/core';

const healthController = new HealthController();
const actionsController = new ActionsController(new ActionService());
const conversationsController = new ConversationsController(new ConversationService());

interface RouteDeps {
  datasourceService: DatasourceService;
  schemaService: SchemaService;
  actionService?: ActionService;
  conversationService?: ConversationService;
  queryService?: QueryService;
  queryExecutor?: QueryExecutor;
  getDBClient?: (datasourceId: number) => Promise<unknown>;
  getDatasourceConfig?: (datasourceId: number) => Promise<unknown>;
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
  app.put('/datasources/:id', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).update(req, reply),
  );
  app.delete('/datasources/:id', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).destroy(req, reply),
  );
  app.post('/datasources/:id/sync', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).sync(req, reply),
  );
  app.get('/datasources/:id/schema', (req, reply) =>
    new DatasourcesController(deps.datasourceService, deps.schemaService).schema(req, reply),
  );

  const actionSvc = deps.actionService ?? actionsController['service'];
  const conversationSvc = deps.conversationService ?? conversationsController['service'];

  app.get('/actions', (req, reply) => new ActionsController(actionSvc).index(req, reply));
  app.get('/actions/:id', (req, reply) => new ActionsController(actionSvc).show(req, reply));
  app.post('/actions', (req, reply) => new ActionsController(actionSvc).store(req, reply));
  app.put('/actions/:id', (req, reply) => new ActionsController(actionSvc).update(req, reply));
  app.delete('/actions/:id', (req, reply) => new ActionsController(actionSvc).destroy(req, reply));
  app.post('/actions/:id/execute', (req, reply) =>
    new ActionsController(actionSvc).execute(req, reply),
  );

  app.post('/query', (req, reply) =>
    new QueriesController(
      deps.queryService ??
        new QueryService({
          datasourceService: deps.datasourceService,
          actionService: actionSvc,
          planner: new QueryPlanner(),
          executor: deps.queryExecutor,
          getDBClient: deps.getDBClient,
          getDatasourceConfig: deps.getDatasourceConfig,
        }),
    ).run(req, reply),
  );

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
};
