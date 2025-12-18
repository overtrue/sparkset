/*
|--------------------------------------------------------------------------
| Container bindings middleware
|--------------------------------------------------------------------------
|
| The container bindings middleware binds classes to their container
| bindings. The HTTP context can access these bindings using the
| ctx.use() method.
|
*/

import { HttpContext } from '@adonisjs/core/http';
import { Logger } from '@adonisjs/core/logger';
import type { NextFn } from '@adonisjs/core/types/http';

/**
 * The container bindings middleware binds classes to their container
 * bindings
 */
export default class ContainerBindingsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    /**
     * Bind the logger to the HTTP context
     */
    ctx.logger = new Logger({
      enabled: true,
      name: 'adonisjs',
      level: 'info',
    });

    return next();
  }
}
