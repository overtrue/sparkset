import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpContext } from '@adonisjs/core/http';
import ConversationsController from '../../../app/controllers/conversations_controller.js';
import { QUERY_ERROR_CODES } from '@sparkset/core';
import { ConversationService } from '../../../app/services/conversation_service.js';
import type { Conversation, Message } from '../../../app/models/types.js';

interface ConversationServiceMock {
  listByUserId: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  messagesByConversation: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  appendMessage: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  payload: ({ [key: string]: unknown; details?: unknown[]; messages?: unknown[] } & {
    message?: unknown;
    code?: unknown;
    retryAfter?: unknown;
  }) | undefined;
  status: (code: number) => MockResponse;
  header: (name: string, value: string) => MockResponse;
  send: (payload: Record<string, unknown>) => Record<string, unknown>;
  ok: (payload: Record<string, unknown>) => Record<string, unknown>;
  created: (payload: Record<string, unknown>) => Record<string, unknown>;
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 0,
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
    ok(payload) {
      response.payload = payload;
      return response.send(payload);
    },
    created(payload) {
      response.payload = payload;
      return response.send(payload);
    },
  };

  return response;
};

interface Logger { error: ReturnType<typeof vi.fn> }

const createMockContext = ({
  params,
  body,
  userId,
  response,
}: {
  params?: { id?: string | number };
  body?: Record<string, unknown>;
  userId?: number;
  response: MockResponse;
}): HttpContext & { logger: Logger } => {
  return {
    params: params ?? {},
    request: {
      body: () => body ?? {},
    },
    response,
    auth: userId ? { user: { id: userId } } : undefined,
    logger: {
      error: vi.fn(),
    },
  } as unknown as HttpContext & { logger: Logger };
};

describe('ConversationsController', () => {
  let service: ConversationServiceMock;
  let createController: () => ConversationsController;

  beforeEach(() => {
    service = {
      listByUserId: vi.fn(),
      get: vi.fn(),
      messagesByConversation: vi.fn(),
      create: vi.fn(),
      appendMessage: vi.fn(),
    };
    createController = () => new ConversationsController(service as unknown as ConversationService);
  });

  it('returns unauthenticated error when user is missing', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: undefined,
    });

    await controller.index(ctx);

    expect(response.statusCode).toBe(401);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.UNAUTHENTICATED);
    expect(service.listByUserId).not.toHaveBeenCalled();
  });

  it('returns validation error when conversation id is invalid', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: 1,
      params: { id: 'abc' },
    });

    await controller.show(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(response.payload?.details?.[0]).toContain('conversationId must be a positive integer');
    expect(service.get).not.toHaveBeenCalled();
  });

  it('returns conversation not found in show endpoint', async () => {
    service.get.mockResolvedValue(null);
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: 1,
      params: { id: '100' },
    });

    await controller.show(ctx);

    expect(response.statusCode).toBe(404);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND);
  });

  it('returns forbidden in show endpoint when conversation does not belong to user', async () => {
    service.get.mockResolvedValue({ id: 7, userId: 999, title: 'x' });
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: 1,
      params: { id: '7' },
    });

    await controller.show(ctx);

    expect(response.statusCode).toBe(403);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN);
  });

  it('maps append message body validation errors', async () => {
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: 1,
      params: { id: '9' },
      body: { role: 'user', content: '' },
    });
    service.get.mockResolvedValue({ id: 9, userId: 1, title: 'x' });

    await controller.appendMessage(ctx);

    expect(response.statusCode).toBe(400);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.VALIDATION_ERROR);
    expect(response.payload?.details?.[0]).toContain('content');
  });

  it('returns flattened conversation detail payload', async () => {
    const conversation: Conversation = {
      id: 3,
      userId: 1,
      title: 'History',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
    };
    const messages: Message[] = [
      {
        id: 8,
        conversationId: 3,
        role: 'user',
        content: 'question',
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 9,
        conversationId: 3,
        role: 'assistant',
        content: 'reply',
        createdAt: new Date('2024-01-02'),
      },
    ];

    service.get.mockResolvedValue(conversation);
    service.messagesByConversation.mockResolvedValue(messages);
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: 1,
      params: { id: '3' },
    });

    await controller.show(ctx);

    expect(response.payload?.id).toBe(3);
    expect(Array.isArray(response.payload?.messages)).toBe(true);
    expect((response.payload?.messages?.[0] as { content?: string })?.content).toBe('question');
    expect('conversation' in (response.payload ?? {})).toBe(false);
  });

  it('maps internal service errors to protocol payload', async () => {
    service.listByUserId.mockRejectedValue(new Error('database down'));
    const response = createMockResponse();
    const controller = createController();
    const ctx = createMockContext({
      response,
      userId: 1,
    });

    await controller.index(ctx);

    expect(response.statusCode).toBe(500);
    expect(response.payload?.code).toBe(QUERY_ERROR_CODES.INTERNAL_ERROR);
  });
});
