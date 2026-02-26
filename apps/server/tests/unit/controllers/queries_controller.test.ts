import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpContext } from '@adonisjs/core/http';
import QueriesController from '../../../app/controllers/queries_controller.js';
import {
  QUERY_ERROR_CODES,
  CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
  CONVERSATION_MESSAGE_METADATA_VERSION,
  QUERY_REQUEST_LIMIT_MAX,
  QUERY_REQUEST_QUESTION_MAX_LENGTH,
} from '@sparkset/core';
import { ConversationService } from '../../../app/services/conversation_service.js';
import type { QueryService } from '../../../app/services/query_service.js';

interface QueryServiceMock {
  run: ReturnType<typeof vi.fn>;
}

interface ConversationServiceMock {
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  appendMessage: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  payload:
    | ({ [key: string]: unknown; details?: unknown[] } & {
        code?: unknown;
        message?: unknown;
        retryAfter?: unknown;
      })
    | undefined;
  status: (code: number) => MockResponse;
  header: (name: string, value: string) => MockResponse;
  send: (payload: Record<string, unknown>) => Record<string, unknown>;
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    headers: {},
    payload: undefined,
    status(code) {
      response.statusCode = code;
      return response;
    },
    header(name, value) {
      response.headers[name] = value;
      return response;
    },
    send(payload) {
      response.payload = payload;
      return payload;
    },
  };

  return response;
};

interface Logger {
  error: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
}

const createMockContext = ({
  body,
  userId,
  response,
}: {
  body: Record<string, unknown>;
  userId?: number;
  response: MockResponse;
}): HttpContext & { logger: Logger } => {
  return {
    request: {
      body: () => body,
    },
    response,
    auth: userId ? { user: { id: userId } } : undefined,
    logger: {
      error: vi.fn(),
      info: vi.fn(),
    },
  } as unknown as HttpContext & { logger: Logger };
};

describe('QueriesController', () => {
  let queryService: QueryServiceMock;
  let conversationService: ConversationServiceMock;
  let createController: () => QueriesController;

  beforeEach(() => {
    queryService = {
      run: vi.fn(),
    };
    conversationService = {
      get: vi.fn(),
      create: vi.fn(),
      appendMessage: vi.fn(),
    };
    createController = () =>
      new QueriesController(
        queryService as unknown as QueryService,
        conversationService as unknown as ConversationService,
      );
  });

  it('returns unauthenticated error when user is missing', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me recent orders',
      },
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(401);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.UNAUTHENTICATED);
    expect(response.payload?.message).toBe('User not authenticated');
    expect(queryService.run).not.toHaveBeenCalled();
  });

  it('returns not found error when conversation does not exist', async () => {
    conversationService.get.mockResolvedValue(null);
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me sales',
        conversationId: 999,
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(conversationService.get).toHaveBeenCalledWith(999);
    expect(response.statusCode).toBe(404);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND);
    expect(queryService.run).not.toHaveBeenCalled();
  });

  it('returns forbidden error when conversation belongs to another user', async () => {
    conversationService.get.mockResolvedValue({ id: 7, userId: 999, title: 'x' });
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me users',
        conversationId: 7,
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(403);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN);
    expect(queryService.run).not.toHaveBeenCalled();
  });

  it('normalizes validation errors from request schema', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: ' ',
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(response.payload?.details).toBeInstanceOf(Array);
    expect(queryService.run).not.toHaveBeenCalled();
  });

  it('validates question length against shared protocol constraints', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'a'.repeat(QUERY_REQUEST_QUESTION_MAX_LENGTH + 1),
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(response.payload?.details?.[0]).toContain('question');
    expect(response.payload?.details?.[0]).toContain('must not exceed');
  });

  it('validates limit upper bound against shared protocol constraints', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me sales',
        limit: QUERY_REQUEST_LIMIT_MAX + 1,
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(response.payload?.details?.[0]).toContain('limit');
    expect(response.payload?.details?.[0]).toContain('must be less than or equal to');
  });

  it('maps planner schema sync error to configuration error response', async () => {
    queryService.run.mockRejectedValue(
      new Error('No tables found in datasource. Please sync the schema first.'),
    );

    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me orders',
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.CONFIGURATION_ERROR);
    expect(response.payload?.message).toContain('No tables found in datasource');
  });

  it('checks authentication before request validation', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: ' ',
      },
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(401);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.UNAUTHENTICATED);
    expect(response.payload?.details).toBeUndefined();
    expect(conversationService.get).not.toHaveBeenCalled();
    expect(queryService.run).not.toHaveBeenCalled();
  });

  it('maps rate limit service errors to retryable payload', async () => {
    queryService.run.mockRejectedValue({
      status: 429,
      message: 'Too many requests. Please retry after 30 seconds.',
    });

    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me revenue',
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(429);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.RATE_LIMIT);
    expect(response.payload?.retryAfter).toBe(30);
    expect(response.headers['Retry-After']).toBe('30');
  });

  it('maps database service errors to database payload', async () => {
    queryService.run.mockRejectedValue({
      status: 400,
      code: 'E_DATABASE_ERROR',
      message: 'Unknown column "user_id"',
      details: [],
    });

    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me users',
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.DATABASE_ERROR);
    expect(response.payload?.message).toContain('Unknown column "user_id"');
  });

  it('stores query-result metadata with protocol version when query succeeds', async () => {
    queryService.run.mockResolvedValue({
      sql: 'SELECT id, name FROM users LIMIT 2',
      rows: [{ id: 1 }, { id: 2 }],
      summary: 'Found users',
    });

    conversationService.create.mockResolvedValue({ id: 901 });
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show me users',
        datasource: 3,
        aiProvider: 7,
        limit: 50,
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({
      sql: 'SELECT id, name FROM users LIMIT 2',
      rows: [{ id: 1 }, { id: 2 }],
      summary: 'Found users',
      conversationId: 901,
    });

    expect(conversationService.create).toHaveBeenCalledTimes(1);
    expect(conversationService.appendMessage).toHaveBeenCalledTimes(2);

    const assistantMessage = conversationService.appendMessage.mock.calls[1]?.[0];
    expect(assistantMessage).toMatchObject({
      conversationId: 901,
      role: 'assistant',
      metadata: {
        schemaVersion: CONVERSATION_MESSAGE_METADATA_VERSION,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT id, name FROM users LIMIT 2',
        rowCount: 2,
        summary: 'Found users',
        hasResult: true,
        datasourceId: 3,
        aiProviderId: 7,
        limit: 50,
      },
    });
  });

  it('stores no-result metadata as rowCount=0 and hasResult=false', async () => {
    queryService.run.mockResolvedValue({
      sql: 'SELECT id FROM users WHERE id = 0',
      rows: [],
      summary: 'No rows',
    });

    conversationService.create.mockResolvedValue({ id: 902 });
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      body: {
        question: 'show missing users',
      },
      userId: 1,
      response,
    });

    await controller.run(ctx);

    expect(response.statusCode).toBe(200);

    const assistantMessage = conversationService.appendMessage.mock.calls[1]?.[0];
    expect(assistantMessage).toMatchObject({
      conversationId: 902,
      role: 'assistant',
      metadata: {
        schemaVersion: CONVERSATION_MESSAGE_METADATA_VERSION,
        kind: CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
        sql: 'SELECT id FROM users WHERE id = 0',
        rowCount: 0,
        summary: 'No rows',
        hasResult: false,
      },
    });
  });
});
