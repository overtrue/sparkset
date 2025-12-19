/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';

const HealthController = () => import('#controllers/health_controller');
const ConversationsController = () => import('#controllers/conversations_controller');
const DatasourcesController = () => import('#controllers/datasources_controller');
const ActionsController = () => import('#controllers/actions_controller');
const QueriesController = () => import('#controllers/queries_controller');
const AIProvidersController = () => import('#controllers/ai_providers_controller');
const DatasetsController = () => import('#controllers/datasets_controller');
const ChartsController = () => import('#controllers/charts_controller');

router.get('/health', [HealthController, 'handle']);

// Datasource routes
router
  .group(() => {
    router.get('/', [DatasourcesController, 'index']);
    router.post('/', [DatasourcesController, 'store']);
    router.post('/test-connection', [DatasourcesController, 'testConnectionByConfig']);
    router.post('/:id/sync', [DatasourcesController, 'sync']);
    router.post('/:id/test-connection', [DatasourcesController, 'testConnection']);
    router.post('/:id/semantic-descriptions', [
      DatasourcesController,
      'generateSemanticDescriptions',
    ]);
    router.get('/:id/schema', [DatasourcesController, 'schema']);
    router.put('/:id/tables/:tableId', [DatasourcesController, 'updateTableMetadata']);
    router.put('/:id/columns/:columnId', [DatasourcesController, 'updateColumnMetadata']);
    router.post('/:id/set-default', [DatasourcesController, 'setDefault']);
    router.get('/:id', [DatasourcesController, 'show']);
    router.put('/:id', [DatasourcesController, 'update']);
    router.delete('/:id', [DatasourcesController, 'destroy']);
  })
  .prefix('/datasources');

// Action routes
router
  .group(() => {
    router.get('/', [ActionsController, 'index']);
    router.get('/:id', [ActionsController, 'show']);
    router.post('/', [ActionsController, 'store']);
    router.post('/generate-sql', [ActionsController, 'generateSQL']);
    router.put('/:id', [ActionsController, 'update']);
    router.delete('/:id', [ActionsController, 'destroy']);
    router.post('/:id/execute', [ActionsController, 'execute']);
  })
  .prefix('/actions');

// Query routes
router.post('/query', [QueriesController, 'run']);

// Conversation routes
router
  .group(() => {
    router.get('/', [ConversationsController, 'index']);
    router.get('/:id', [ConversationsController, 'show']);
    router.post('/', [ConversationsController, 'store']);
    router.post('/:id/messages', [ConversationsController, 'appendMessage']);
  })
  .prefix('/conversations');

// AI Provider routes
router
  .group(() => {
    router.get('/', [AIProvidersController, 'index']);
    router.post('/', [AIProvidersController, 'store']);
    router.post('/test-connection', [AIProvidersController, 'testConnectionByConfig']);
    router.post('/:id/test-connection', [AIProvidersController, 'testConnection']);
    router.post('/:id/set-default', [AIProvidersController, 'setDefault']);
    router.put('/:id', [AIProvidersController, 'update']);
    router.delete('/:id', [AIProvidersController, 'destroy']);
  })
  .prefix('/ai-providers');

// Dataset routes
router
  .group(() => {
    router.get('/', [DatasetsController, 'index']);
    router.post('/', [DatasetsController, 'store']);
    router.get('/:id', [DatasetsController, 'show']);
    router.put('/:id', [DatasetsController, 'update']);
    router.delete('/:id', [DatasetsController, 'destroy']);
    router.post('/:id/preview', [DatasetsController, 'preview']);
  })
  .prefix('/api/datasets');

// Chart routes
router
  .group(() => {
    router.get('/', [ChartsController, 'index']);
    router.post('/', [ChartsController, 'store']);
    router.get('/:id', [ChartsController, 'show']);
    router.put('/:id', [ChartsController, 'update']);
    router.delete('/:id', [ChartsController, 'destroy']);
    router.get('/:id/render', [ChartsController, 'render']);
    router.post('/preview', [ChartsController, 'preview']);
  })
  .prefix('/api/charts');
