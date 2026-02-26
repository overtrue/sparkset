/**
 * Application-specific exceptions
 *
 * Custom exception classes for better error handling and response formatting.
 */

import { Exception } from '@adonisjs/core/exceptions';

/**
 * Base exception for validation errors
 */
export class ValidationException extends Exception {
  static status = 400;
  static code = 'E_VALIDATION_ERROR';

  constructor(message: string, options?: { field?: string }) {
    super(message, { status: 400, code: 'E_VALIDATION_ERROR' });
    if (options?.field) {
      this.message = `${options.field}: ${message}`;
    }
  }
}

/**
 * Exception for resource not found errors
 */
export class NotFoundException extends Exception {
  static status = 404;
  static code = 'E_NOT_FOUND';

  constructor(resource: string, id?: number | string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, { status: 404, code: 'E_NOT_FOUND' });
  }
}

/**
 * Exception for authentication errors
 */
export class AuthenticationException extends Exception {
  static status = 401;
  static code = 'E_AUTHENTICATION_FAILED';

  constructor(message = 'Authentication required') {
    super(message, { status: 401, code: 'E_AUTHENTICATION_FAILED' });
  }
}

/**
 * Exception for authorization errors
 */
export class AuthorizationException extends Exception {
  static status = 403;
  static code = 'E_AUTHORIZATION_FAILED';

  constructor(message = 'You are not authorized to perform this action') {
    super(message, { status: 403, code: 'E_AUTHORIZATION_FAILED' });
  }
}

/**
 * Exception for business logic errors
 */
export class BusinessException extends Exception {
  static status = 400;
  static code = 'E_BUSINESS_ERROR';

  constructor(message: string, code?: string) {
    super(message, { status: 400, code: code || 'E_BUSINESS_ERROR' });
  }
}

/**
 * Exception for external service errors (AI providers, database connections, etc.)
 */
export class ExternalServiceException extends Exception {
  static status = 502;
  static code = 'E_EXTERNAL_SERVICE_ERROR';

  constructor(service: string, message: string) {
    super(`${service}: ${message}`, { status: 502, code: 'E_EXTERNAL_SERVICE_ERROR' });
  }
}

/**
 * Exception for query/database execution errors
 */
export class DatabaseException extends Exception {
  static status = 400;
  static code = 'E_DATABASE_ERROR';

  constructor(message: string) {
    super(message, { status: 400, code: 'E_DATABASE_ERROR' });
  }
}

/**
 * Exception for configuration errors
 */
export class ConfigurationException extends Exception {
  static status = 400;
  static code = 'E_CONFIGURATION_ERROR';

  constructor(message: string) {
    super(message, { status: 400, code: 'E_CONFIGURATION_ERROR' });
  }
}

/**
 * Exception for rate limiting
 */
export class RateLimitException extends Exception {
  static status = 429;
  static code = 'E_RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests. Please try again later.') {
    super(message, { status: 429, code: 'E_RATE_LIMIT_EXCEEDED' });
  }
}
