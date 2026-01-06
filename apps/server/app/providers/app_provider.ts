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
import { registerBotAdapters } from '../adapters/index.js';

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  register() {}

  /**
   * The application has been booted
   */
  async boot() {
    // Initialize all available Bot adapters
    registerBotAdapters();
  }

  /**
   * The application has been started
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async start() {}

  /**
   * The process has been ready
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async shutdown() {}
}
