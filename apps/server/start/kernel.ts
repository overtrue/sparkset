/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file registers all the middleware required to run the
| AdonisJS HTTP server.
|
*/

import router from '@adonisjs/core/services/router';
import server from '@adonisjs/core/services/server';

/**
 * The error handler is used to convert an exception
 * to a HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'));

/**
 * The server middleware stack runs on all the HTTP requests
 * even if there is no route registered for the request URL.
 */
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
]);

/**
 * The router middleware stack runs on all the HTTP requests
 * with a registered route.
 */
router.use([() => import('@adonisjs/core/bodyparser_middleware')]);

/**
 * Register named middleware collection
 */
router.named({
  // auth: () => import('#middleware/auth_middleware'),
});
