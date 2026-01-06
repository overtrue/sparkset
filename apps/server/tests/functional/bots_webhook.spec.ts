import { test } from 'vitest';
import Bot from '../../app/models/bot.js';
import BotEvent from '../../app/models/bot_event.js';
import { MessageDispatcher } from '../../app/services/message_dispatcher.js';
import { BotErrorHandler } from '../../app/services/bot_error_handler.js';
import type { ParsedMessage } from '../../app/types/bot_adapter.js';

/**
 * Integration tests for Bot Webhook processing
 *
 * Tests the complete flow:
 * 1. Message intent detection
 * 2. Error handling and retry logic
 * 3. Exponential backoff calculation
 */

// Helper to create ParsedMessage
function createMessage(text: string): ParsedMessage {
  return {
    text,
    externalUserId: 'user123',
    externalUserName: 'User Name',
    messageType: 'text',
    rawPayload: {},
  };
}

test('MessageDispatcher should detect query intent with keywords', async ({ expect }) => {
  const dispatcher = new MessageDispatcher();

  // Create mock bot
  const bot = {
    id: 1,
    enabledActions: undefined,
    enableQuery: true,
  } as Partial<typeof Bot> as Bot;

  // Message with query keywords
  const message = createMessage('最近30天的销售额是多少');

  const result = await dispatcher.detectIntent(bot, message);

  expect(result).toBeDefined();
  expect(result.type).toBe('query');
  expect(result.confidence).toBeGreaterThan(0);
});

test('MessageDispatcher should detect unknown intent when no match', async ({ expect }) => {
  const dispatcher = new MessageDispatcher();

  const bot = {
    id: 1,
    enabledActions: undefined,
    enableQuery: false,
  } as Partial<typeof Bot> as Bot;

  const message = createMessage('你好');

  const result = await dispatcher.detectIntent(bot, message);

  expect(result.type).toBe('unknown');
  expect(result.confidence).toBe(0);
});

test('BotErrorHandler should classify network errors as retryable', ({ expect }) => {
  const handler = new BotErrorHandler();

  // Access private method through type assertion
  const classifyError = (handler as unknown as { classifyError: (err: Error) => unknown })
    .classifyError;

  const networkError = new Error('ECONNREFUSED: Connection refused');
  const result = classifyError.call(handler, networkError) as {
    retryable: boolean;
    code: string;
  };

  expect(result.retryable).toBe(true);
  expect(result.code).toBe('NETWORK_ERROR');
});

test('BotErrorHandler should classify validation errors as non-retryable', ({ expect }) => {
  const handler = new BotErrorHandler();

  const classifyError = (handler as unknown as { classifyError: (err: Error) => unknown })
    .classifyError;

  const validationError = new Error('Invalid parameter: username');
  const result = classifyError.call(handler, validationError) as {
    retryable: boolean;
    code: string;
  };

  expect(result.retryable).toBe(false);
  expect(result.code).toBe('OPERATION_FAILED');
});

test('BotErrorHandler should succeed on retry', async ({ expect }) => {
  const handler = new BotErrorHandler();
  let attempts = 0;

  const operation = async () => {
    attempts += 1;
    if (attempts < 2) {
      throw new Error('ECONNREFUSED: Connection refused');
    }
    return 'success';
  };

  const event = {
    id: 1,
    botId: 1,
  } as Partial<typeof BotEvent> as BotEvent;

  const result = await handler.executeWithRetry(operation, event, 'test_operation');

  expect(result.success).toBe(true);
  expect(result.data).toBe('success');
  expect(result.attempts).toBe(2);
});

test('BotErrorHandler should fail after max retries', async ({ expect }) => {
  const handler = new BotErrorHandler();
  // Track attempts to verify retry behavior
  void 0; // Placeholder

  const operation = async () => {
    throw new Error('ECONNREFUSED: Connection refused');
  };

  const event = {
    id: 1,
    botId: 1,
  } as Partial<typeof BotEvent> as BotEvent;

  const result = await handler.executeWithRetry(operation, event, 'test_operation');

  expect(result.success).toBe(false);
  expect(result.attempts).toBe(4); // max retries (3) + 1 initial
  expect(result.error?.retryable).toBe(true);
});

test('BotErrorHandler should fail immediately on non-retryable error', async ({ expect }) => {
  const handler = new BotErrorHandler();
  // Track attempts to verify no retry occurs
  void 0; // Placeholder

  const operation = async () => {
    throw new Error('Validation failed: invalid input');
  };

  const event = {
    id: 1,
    botId: 1,
  } as Partial<typeof BotEvent> as BotEvent;

  const result = await handler.executeWithRetry(operation, event, 'test_operation');

  expect(result.success).toBe(false);
  expect(result.attempts).toBe(1); // No retry
  expect(result.error?.retryable).toBe(false);
});

test('BotErrorHandler should calculate exponential backoff correctly', ({ expect }) => {
  const handler = new BotErrorHandler({
    maxRetries: 2,
    initialDelayMs: 100,
    maxDelayMs: 400,
    backoffMultiplier: 2,
  });

  const calculateBackoffDelay = (
    handler as unknown as { calculateBackoffDelay: (n: number) => number }
  ).calculateBackoffDelay;

  // Attempt 1: 100 * 2^(1-2) = 50ms
  const delay1 = calculateBackoffDelay.call(handler, 1);
  expect(delay1).toBe(50);

  // Attempt 2: 100 * 2^(2-2) = 100ms
  const delay2 = calculateBackoffDelay.call(handler, 2);
  expect(delay2).toBe(100);

  // Attempt 3: 100 * 2^(3-2) = 200ms
  const delay3 = calculateBackoffDelay.call(handler, 3);
  expect(delay3).toBe(200);

  // Attempt 4: Would be 400ms, capped at maxDelayMs
  const delay4 = calculateBackoffDelay.call(handler, 4);
  expect(delay4).toBe(400);
});

test('Intent detection respects bot configuration', async ({ expect }) => {
  const dispatcher = new MessageDispatcher();

  // Bot with query disabled
  const botNoQuery = {
    id: 1,
    enabledActions: undefined,
    enableQuery: false,
  } as Partial<typeof Bot> as Bot;

  const message = createMessage('多少钱？');

  const result = await dispatcher.detectIntent(botNoQuery, message);
  expect(result.type).toBe('unknown'); // Query disabled

  // Bot with query enabled
  const botWithQuery = {
    id: 2,
    enabledActions: undefined,
    enableQuery: true,
  } as Partial<typeof Bot> as Bot;

  const result2 = await dispatcher.detectIntent(botWithQuery, message);
  expect(result2.type).toBe('query'); // Query enabled
});
