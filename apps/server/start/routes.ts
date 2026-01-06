/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router';
import { apiAuthMiddleware } from '#middleware/api_auth_middleware';

const HealthController = () => import('#controllers/health_controller');
const LocalAuthController = () => import('#controllers/local_auth_controller');
const ConversationsController = () => import('#controllers/conversations_controller');
const DatasourcesController = () => import('#controllers/datasources_controller');
const ActionsController = () => import('#controllers/actions_controller');
const QueriesController = () => import('#controllers/queries_controller');
const AIProvidersController = () => import('#controllers/ai_providers_controller');
const DatasetsController = () => import('#controllers/datasets_controller');
const ChartsController = () => import('#controllers/charts_controller');
const DashboardsController = () => import('#controllers/dashboards_controller');
const DashboardWidgetsController = () => import('#controllers/dashboard_widgets_controller');
const BotsController = () => import('#controllers/bots_controller');
const WebhooksController = () => import('#controllers/webhooks_controller');

// Public routes
router.get('/health', [HealthController, 'handle']);

// Auth routes (public)
router.post('/auth/local/login', [LocalAuthController, 'login']);
router.post('/auth/local/register', [LocalAuthController, 'register']);
router.post('/auth/local/logout', [LocalAuthController, 'logout']);
router.post('/auth/local/refresh', [LocalAuthController, 'refresh']);
router.get('/auth/local/status', [LocalAuthController, 'status']);

// Datasource routes (requires authentication)
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
  .prefix('/datasources')
  .middleware([apiAuthMiddleware]);

// Action routes (requires authentication)
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
  .prefix('/actions')
  .middleware([apiAuthMiddleware]);

// Query routes (requires authentication)
router.post('/query', [QueriesController, 'run']).middleware([apiAuthMiddleware]);

// Conversation routes (requires authentication)
router
  .group(() => {
    router.get('/', [ConversationsController, 'index']);
    router.get('/:id', [ConversationsController, 'show']);
    router.post('/', [ConversationsController, 'store']);
    router.post('/:id/messages', [ConversationsController, 'appendMessage']);
  })
  .prefix('/conversations')
  .middleware([apiAuthMiddleware]);

// AI Provider routes (requires authentication)
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
  .prefix('/ai-providers')
  .middleware([apiAuthMiddleware]);

// Dataset routes (requires authentication)
router
  .group(() => {
    router.get('/', [DatasetsController, 'index']);
    router.post('/', [DatasetsController, 'store']);
    router.get('/:id', [DatasetsController, 'show']);
    router.put('/:id', [DatasetsController, 'update']);
    router.delete('/:id', [DatasetsController, 'destroy']);
    router.post('/:id/preview', [DatasetsController, 'preview']);
  })
  .prefix('/api/datasets')
  .middleware([apiAuthMiddleware]);

// Chart routes (requires authentication)
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
  .prefix('/api/charts')
  .middleware([apiAuthMiddleware]);

// Dashboard routes (requires authentication)
router
  .group(() => {
    router.get('/', [DashboardsController, 'index']);
    router.post('/', [DashboardsController, 'store']);
    router.get('/:id', [DashboardsController, 'show']);
    router.put('/:id', [DashboardsController, 'update']);
    router.delete('/:id', [DashboardsController, 'destroy']);
  })
  .prefix('/api/dashboards')
  .middleware([apiAuthMiddleware]);

// Dashboard Widget routes (requires authentication)
router
  .group(() => {
    router.post('/:dashboardId/widgets', [DashboardWidgetsController, 'store']);
    // 更具体的路由需要在更通用的路由之前
    router.put('/:dashboardId/widgets/layout', [DashboardWidgetsController, 'updateLayout']);
    router.post('/:dashboardId/widgets/:id/refresh', [DashboardWidgetsController, 'refresh']);
    router.put('/:dashboardId/widgets/:id', [DashboardWidgetsController, 'update']);
    router.delete('/:dashboardId/widgets/:id', [DashboardWidgetsController, 'destroy']);
  })
  .prefix('/api/dashboards')
  .middleware([apiAuthMiddleware]);

// Bot routes (requires authentication)
router
  .group(() => {
    router.get('/', [BotsController, 'index']);
    router.post('/', [BotsController, 'store']);
    router.get('/:id', [BotsController, 'show']);
    router.put('/:id', [BotsController, 'update']);
    router.delete('/:id', [BotsController, 'destroy']);
    router.post('/:id/regenerate-token', [BotsController, 'regenerateToken']);
  })
  .prefix('/api/bots')
  .middleware([apiAuthMiddleware]);

// Webhook routes (public - no authentication required)
router
  .group(() => {
    router.post('/:botId/:token', [WebhooksController, 'handleBotWebhook']);
  })
  .prefix('/webhooks/bot');
