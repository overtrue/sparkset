/*
|--------------------------------------------------------------------------
| App service provider
|--------------------------------------------------------------------------
|
| The AppProvider is used to initialize application-level services and
| dependencies. This provider is loaded on every HTTP request.
|
*/

import type { ApplicationService } from '@adonisjs/core/types';

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The application has been booted
   */
  async boot() {}

  /**
   * The application has been started
   */
  async start() {}

  /**
   * The process has been ready
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
