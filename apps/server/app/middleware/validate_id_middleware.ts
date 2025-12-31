/**
 * ID Validation Middleware
 *
 * Validates route parameter IDs and converts them to numbers.
 * Use this middleware to ensure route params are valid positive integers.
 */

import { HttpContext } from '@adonisjs/core/http';
import { NextFn } from '@adonisjs/core/types/http';
import { toId } from '../utils/validation.js';

/**
 * Create a middleware that validates a route parameter ID
 *
 * @param paramName - The name of the route parameter to validate (default: 'id')
 * @param resourceName - The name of the resource for error messages (default: inferred from paramName)
 */
export function createValidateIdMiddleware(
  paramName = 'id',
  resourceName?: string,
): (ctx: HttpContext, next: NextFn) => Promise<void> {
  const displayName = resourceName || paramName.replace('Id', '').replace('_id', '') || 'resource';

  return async (ctx: HttpContext, next: NextFn): Promise<void> => {
    const rawValue = ctx.params[paramName];

    if (rawValue === undefined) {
      // Param not in route - skip validation
      return next();
    }

    const id = toId(rawValue);

    if (!id) {
      ctx.response.badRequest({
        error: 'Validation Error',
        message: `Invalid ${displayName} ID`,
        code: 'E_VALIDATION_ERROR',
      });
      return;
    }

    // Replace string param with validated number
    ctx.params[paramName] = id;
    return next();
  };
}

/**
 * Pre-configured middleware for common ID parameters
 */
export const validateIdMiddleware = createValidateIdMiddleware('id');
export const validateDatasourceIdMiddleware = createValidateIdMiddleware('id', 'datasource');
export const validateActionIdMiddleware = createValidateIdMiddleware('id', 'action');
export const validateDatasetIdMiddleware = createValidateIdMiddleware('id', 'dataset');
export const validateChartIdMiddleware = createValidateIdMiddleware('id', 'chart');
export const validateDashboardIdMiddleware = createValidateIdMiddleware('id', 'dashboard');
export const validateProviderIdMiddleware = createValidateIdMiddleware('id', 'provider');

/**
 * Shorthand function for inline middleware usage
 */
export function validateId(
  paramName = 'id',
  resourceName?: string,
): (ctx: HttpContext, next: NextFn) => Promise<void> {
  return createValidateIdMiddleware(paramName, resourceName);
}
