import type BotEvent from '../models/bot_event.js';
import BotLog from '../models/bot_log.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number; // exponential backoff factor
}

/**
 * Error details
 */
export interface ErrorDetails {
  code: string;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Execution result with retry tracking
 */
export interface ExecutionResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  attempts: number;
  lastAttemptAt: Date;
}

/**
 * Default retry configuration
 * Max 3 retries with exponential backoff: 1s, 2s, 4s
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
};

/**
 * Error Handler and Retry Manager for Bot operations
 *
 * Responsibilities:
 * 1. Classify errors (retryable vs non-retryable)
 * 2. Implement exponential backoff retry logic
 * 3. Ensure idempotency via request tracking
 * 4. Log all attempts and outcomes
 * 5. Handle timeout and resource exhaustion gracefully
 */
export class BotErrorHandler {
  constructor(private config: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Execute operation with automatic retry on failure
   * Tracks attempts and updates event status
   */
  async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    event: BotEvent,
    operationName: string,
  ): Promise<ExecutionResult<T>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      try {
        const data = await operation(attempt);

        // Success!
        await this.logSuccess(event, operationName, attempt);

        return {
          success: true,
          data,
          attempts: attempt,
          lastAttemptAt: new Date(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Classify the error
        const errorDetails = this.classifyError(lastError);

        // Log the attempt
        await this.logAttempt(event, operationName, attempt, errorDetails);

        // If error is not retryable or we've exhausted retries, fail immediately
        if (!errorDetails.retryable || attempt > this.config.maxRetries) {
          return {
            success: false,
            error: errorDetails,
            attempts: attempt,
            lastAttemptAt: new Date(),
          };
        }

        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(attempt);

        // Wait before next retry
        await this.sleep(delay);
      }
    }

    // Should not reach here, but return error if it does
    return {
      success: false,
      error: {
        code: 'MAX_RETRIES_EXCEEDED',
        message: 'Operation failed after maximum retries',
        originalError: lastError || undefined,
        retryable: false,
      },
      attempts: this.config.maxRetries + 1,
      lastAttemptAt: new Date(),
    };
  }

  /**
   * Classify error as retryable or not
   */
  private classifyError(error: Error): ErrorDetails {
    const message = error.message.toLowerCase();

    // Network errors are retryable
    if (
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('timeout')
    ) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message,
        originalError: error,
        retryable: true,
      };
    }

    // Database lock errors are retryable
    if (
      message.includes('lock') ||
      message.includes('deadlock') ||
      message.includes('resource busy')
    ) {
      return {
        code: 'RESOURCE_BUSY',
        message: error.message,
        originalError: error,
        retryable: true,
      };
    }

    // 5xx server errors are retryable
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return {
        code: 'SERVER_ERROR',
        message: error.message,
        originalError: error,
        retryable: true,
      };
    }

    // All others are non-retryable (validation, auth, 4xx, etc)
    return {
      code: 'OPERATION_FAILED',
      message: error.message,
      originalError: error,
      retryable: false,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    // Formula: initialDelay * (backoffMultiplier ^ (attempt - 1))
    const exponentialDelay =
      this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 2);

    // Cap at maxDelay
    return Math.min(exponentialDelay, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log successful operation
   */
  private async logSuccess(
    event: BotEvent,
    operationName: string,
    _attempts: number,
  ): Promise<void> {
    void _attempts; // Use in Phase 2.5 for detailed logging
    try {
      await BotLog.create({
        botId: event.botId,
        eventId: String(event.id),
        action: `${operationName}_success`,
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to log success:', error);
    }
  }

  /**
   * Log operation attempt (success or failure)
   */
  private async logAttempt(
    event: BotEvent,
    operationName: string,
    attempt: number,
    _error: ErrorDetails,
  ): Promise<void> {
    void _error; // Use in Phase 2.5 for detailed error logging
    try {
      await BotLog.create({
        botId: event.botId,
        eventId: String(event.id),
        action: `${operationName}_attempt_${attempt}_failed`,
      });
    } catch (logError) {
      // Log error but don't fail the operation
      console.error('Failed to log attempt:', logError);
    }
  }

  /**
   * Ensure idempotency: check if event has already been processed
   */
  async isIdempotent(event: BotEvent): Promise<boolean> {
    // In Phase 2.5, implement:
    // 1. Check if event_id + user_id + message_hash exists in success logs
    // 2. Return cached result if found
    // For now, always return false (not idempotent)
    void event;
    return false;
  }

  /**
   * Get cached result from previous successful execution
   */
  async getCachedResult(event: BotEvent): Promise<unknown> {
    // In Phase 2.5, implement:
    // Query BotLog for successful execution and return cached result
    // For now, return null
    void event;
    return null;
  }
}

// Export singleton for DI
export const botErrorHandler = new BotErrorHandler();
