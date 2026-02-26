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
import { Exception } from '@adonisjs/core/exceptions';
import app from '@adonisjs/core/services/app';
import {
  ValidationException,
  NotFoundException,
  AuthenticationException,
  AuthorizationException,
  BusinessException,
  DatabaseException,
  ExternalServiceException,
  RateLimitException,
} from './app_exceptions.js';

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction;

  /**
   * Custom exceptions that should be rendered as JSON
   */
  protected customExceptions = [
    ValidationException,
    NotFoundException,
    AuthenticationException,
    AuthorizationException,
    BusinessException,
    DatabaseException,
    ExternalServiceException,
    RateLimitException,
  ];

  /**
   * Check if the request expects JSON response
   */
  protected wantsJson(ctx: HttpContext): boolean {
    const path = ctx.request.url();
    const acceptHeader = ctx.request.header('accept') ?? '';

    // API paths
    const apiPaths = [
      '/datasources',
      '/actions',
      '/query',
      '/conversations',
      '/ai-providers',
      '/api/',
      '/health',
      '/auth/',
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
    // Always return JSON for API requests
    if (this.wantsJson(ctx)) {
      return this.renderAsJson(error, ctx);
    }

    // For non-API requests, use default behavior
    return super.handle(error, ctx);
  }

  /**
   * Render error as JSON response
   */
  private renderAsJson(error: unknown, ctx: HttpContext) {
    const response = this.formatError(error);
    const status = this.getStatusCode(error);

    // Log error in development
    if (this.debug && status >= 500) {
      ctx.logger.error(error instanceof Error ? error : new Error(String(error)));
    }

    return ctx.response.status(status).json(response);
  }

  /**
   * Format error into standard response format
   */
  private formatError(error: unknown): ErrorResponse {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return {
        error: 'Validation Error',
        message: 'Invalid request data',
        code: 'E_VALIDATION_ERROR',
        details: 'issues' in error ? error.issues : undefined,
      };
    }

    // Handle custom exceptions
    if (error instanceof Exception) {
      const code = 'code' in error ? String(error.code) : undefined;
      return {
        error: this.getErrorTitle(error),
        message: error.message,
        code,
      };
    }

    // Handle standard errors
    if (error instanceof Error) {
      return {
        error: 'Internal Server Error',
        message: this.debug ? error.message : 'An unexpected error occurred',
        code: 'E_INTERNAL_ERROR',
      };
    }

    // Handle unknown errors
    return {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      code: 'E_INTERNAL_ERROR',
    };
  }

  /**
   * Get HTTP status code from error
   */
  private getStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return 400;
    }

    if (error instanceof Exception) {
      return error.status;
    }

    return 500;
  }

  /**
   * Get human-readable error title
   */
  private getErrorTitle(error: Exception): string {
    if (error instanceof ValidationException) return 'Validation Error';
    if (error instanceof NotFoundException) return 'Not Found';
    if (error instanceof AuthenticationException) return 'Authentication Failed';
    if (error instanceof AuthorizationException) return 'Authorization Failed';
    if (error instanceof BusinessException) return 'Business Error';
    if (error instanceof DatabaseException) return 'Database Error';
    if (error instanceof ExternalServiceException) return 'External Service Error';
    if (error instanceof RateLimitException) return 'Rate Limit Exceeded';
    return 'Error';
  }

  /**
   * The method is used to report error to the logging service or
   * the third party error monitoring service.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx);
  }
}
