import { FastifyInstance } from 'fastify';
import { ActionsController } from '../app/Controllers/Http/ActionsController';
import { DatasourcesController } from '../app/Controllers/Http/DatasourcesController';
import { HealthController } from '../app/Controllers/Http/HealthController';
import { QueriesController } from '../app/Controllers/Http/QueriesController';
import { DatasourceService } from '../app/services/datasourceService';
import { ActionService } from '../app/services/actionService';
import { ConversationsController } from '../app/Controllers/Http/ConversationsController';
import { ConversationService } from '../app/services/conversationService';

const healthController = new HealthController();
const datasourcesController = new DatasourcesController(new DatasourceService());
const actionsController = new ActionsController(new ActionService());
const queriesController = new QueriesController();
const conversationsController = new ConversationsController(new ConversationService());

export const registerRoutes = (app: FastifyInstance) => {
  app.get('/health', (req, reply) => healthController.handle(req, reply));

  app.get('/datasources', (req, reply) => datasourcesController.index(req, reply));
  app.post('/datasources', (req, reply) => datasourcesController.store(req, reply));
  app.put('/datasources/:id', (req, reply) => datasourcesController.update(req, reply));
  app.delete('/datasources/:id', (req, reply) => datasourcesController.destroy(req, reply));
  app.post('/datasources/:id/sync', (req, reply) => datasourcesController.sync(req, reply));

  app.get('/actions', (req, reply) => actionsController.index(req, reply));
  app.get('/actions/:id', (req, reply) => actionsController.show(req, reply));
  app.post('/actions', (req, reply) => actionsController.store(req, reply));
  app.put('/actions/:id', (req, reply) => actionsController.update(req, reply));
  app.delete('/actions/:id', (req, reply) => actionsController.destroy(req, reply));
  app.post('/actions/:id/execute', (req, reply) => actionsController.execute(req, reply));

  app.post('/query', (req, reply) => queriesController.run(req, reply));

  app.get('/conversations', (req, reply) => conversationsController.index(req, reply));
  app.get('/conversations/:id', (req, reply) => conversationsController.show(req, reply));
  app.post('/conversations', (req, reply) => conversationsController.store(req, reply));
  app.post('/conversations/:id/messages', (req, reply) =>
    conversationsController.appendMessage(req, reply),
  );
};
