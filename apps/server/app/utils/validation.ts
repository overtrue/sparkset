/**
 * Validation utilities for request parameters
 */

/**
 * Validates that a value is a valid positive integer
 * @param value The value to validate
 * @returns True if valid, false otherwise
 */
export function isValidId(value: unknown): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
}

/**
 * Converts a parameter to a valid ID or returns null if invalid
 * @param value The parameter value to convert
 * @returns The ID as a number, or null if invalid
 */
export function toId(value: unknown): number | null {
  const num = Number(value);
  if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    return null;
  }
  return num;
}
