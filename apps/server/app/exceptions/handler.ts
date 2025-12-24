/*
|--------------------------------------------------------------------------
| Exception Handler
|--------------------------------------------------------------------------
|
| The Exception Handler is used for handling errors thrown during the HTTP
| lifecycle and convert them to a response the client can understand.
|
*/

import { ExceptionHandler, HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction;

  /**
   * Check if the request is an API request based on path or Accept header
   */
  protected isApiRequest(ctx: HttpContext): boolean {
    const path = ctx.request.url();
    const acceptHeader = ctx.request.header('accept') ?? '';

    // API paths
    const apiPaths = [
      '/datasources',
      '/actions',
      '/query',
      '/conversations',
      '/ai-providers',
      '/health',
    ];
    const isApiPath = apiPaths.some((apiPath) => path.startsWith(apiPath));

    // Check Accept header for JSON
    const wantsJson =
      acceptHeader.includes('application/json') ||
      acceptHeader.includes('application/vnd.api+json');

    return isApiPath || wantsJson;
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    // For API requests, always return JSON
    if (this.isApiRequest(ctx)) {
      const httpError = this.#toHttpError(error);

      // Handle validation errors
      if (httpError.code === 'E_VALIDATION_ERROR' && 'messages' in httpError) {
        return this.renderValidationErrorAsJSON(httpError, ctx);
      }

      // All other errors as JSON
      return this.renderErrorAsJSON(httpError, ctx);
    }

    // For non-API requests, use default behavior
    return super.handle(error, ctx);
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx);
  }

  /**
   * Helper to convert error to HttpError format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #toHttpError(error: unknown): any {
    const httpError =
      typeof error === 'object' && error !== null ? error : new Error(String(error));
    if (!('message' in httpError) || !httpError.message) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (httpError as any).message = 'Internal server error';
    }
    if (!('status' in httpError) || !httpError.status) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (httpError as any).status = 500;
    }
    return httpError;
  }
}
