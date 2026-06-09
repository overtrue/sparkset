import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import BotsController from '../../../app/controllers/bots_controller.js';
import type { BotService } from '../../../app/services/bot_service.js';
import type { DerivedResourceAuthorizationService } from '../../../app/services/derived_resource_authorization_service.js';

interface BotServiceMock {
  listBots: ReturnType<typeof vi.fn>;
  createBot: ReturnType<typeof vi.fn>;
  getBot: ReturnType<typeof vi.fn>;
  updateBot: ReturnType<typeof vi.fn>;
  deleteBot: ReturnType<typeof vi.fn>;
  regenerateToken: ReturnType<typeof vi.fn>;
  getWebhookUrlForBot: ReturnType<typeof vi.fn>;
  testBot: ReturnType<typeof vi.fn>;
}

interface ResourceAuthorizationMock {
  canAccessBot: ReturnType<typeof vi.fn>;
  canAccessBotConfig: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  ok: (payload: unknown) => unknown;
  created: (payload: unknown) => unknown;
  badRequest: (payload: unknown) => unknown;
  forbidden: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  notFound: (payload: unknown) => unknown;
  internalServerError: (payload: unknown) => unknown;
  noContent: () => null;
}

const createMockResponse = (): MockResponse => {
  const response: MockResponse = {
    statusCode: 200,
    payload: undefined,
    ok(payload) {
      response.statusCode = 200;
      response.payload = payload;
      return payload;
    },
    created(payload) {
      response.statusCode = 201;
      response.payload = payload;
      return payload;
    },
    badRequest(payload) {
      response.statusCode = 400;
      response.payload = payload;
      return payload;
    },
    forbidden(payload) {
      response.statusCode = 403;
      response.payload = payload;
      return payload;
    },
    unauthorized(payload) {
      response.statusCode = 401;
      response.payload = payload;
      return payload;
    },
    notFound(payload) {
      response.statusCode = 404;
      response.payload = payload;
      return payload;
    },
    internalServerError(payload) {
      response.statusCode = 500;
      response.payload = payload;
      return payload;
    },
    noContent() {
      response.statusCode = 204;
      response.payload = null;
      return null;
    },
  };
  return response;
};

const createMockContext = ({
  params,
  body,
  query,
  user,
  response,
}: {
  params?: Record<string, string | number>;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  user?: { id: number; roles?: string[]; permissions?: string[] };
  response: MockResponse;
}): HttpContext => {
  return {
    params: params ?? {},
    request: {
      body: () => body ?? {},
      input: (key: string, fallback?: unknown) => query?.[key] ?? fallback,
    },
    response,
    auth: user
      ? {
          user: {
            id: user.id,
            roles: user.roles ?? [],
            permissions: user.permissions ?? [],
            isActive: true,
          },
        }
      : undefined,
  } as unknown as HttpContext;
};

const serializeBot = (bot: Record<string, unknown>) => ({
  ...bot,
  serialize: () => bot,
});

describe('BotsController authorization', () => {
  let botService: BotServiceMock;
  let resourceAuthorization: ResourceAuthorizationMock;
  let createController: () => BotsController;

  beforeEach(() => {
    botService = {
      listBots: vi.fn(),
      createBot: vi.fn(),
      getBot: vi.fn(),
      updateBot: vi.fn(),
      deleteBot: vi.fn(),
      regenerateToken: vi.fn(),
      getWebhookUrlForBot: vi.fn(),
      testBot: vi.fn(),
    };
    resourceAuthorization = {
      canAccessBot: vi.fn(),
      canAccessBotConfig: vi.fn(),
    };
    createController = () =>
      new BotsController(
        botService as unknown as BotService,
        resourceAuthorization as unknown as DerivedResourceAuthorizationService,
      );
  });

  it('lists only bots backed by viewable datasources', async () => {
    const bots = [
      serializeBot({ id: 1, enabledDataSources: [3] }),
      serializeBot({ id: 2, enabledDataSources: [4] }),
    ];
    botService.listBots.mockResolvedValue({
      data: bots,
      meta: { total: 2, page: 1, perPage: 10, lastPage: 1 },
    });
    resourceAuthorization.canAccessBot.mockImplementation((_user, bot) => bot.id === 1);
    const response = createMockResponse();

    await createController().index(createMockContext({ response, user: { id: 7 } }));

    expect(resourceAuthorization.canAccessBot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      bots[0],
      'datasource:view',
    );
    expect(resourceAuthorization.canAccessBot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      bots[1],
      'datasource:view',
    );
    expect(response.payload).toEqual({ items: [bots[0]] });
  });

  it('requires datasource query permission before creating a query-enabled bot', async () => {
    resourceAuthorization.canAccessBotConfig.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().store(
      createMockContext({
        response,
        user: { id: 7 },
        body: {
          name: 'Assistant',
          type: 'custom',
          enabledDataSources: [3],
          defaultDataSourceId: 3,
        },
      }),
    );

    expect(resourceAuthorization.canAccessBotConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      { enabledDataSources: [3], defaultDataSourceId: 3 },
      'datasource:query',
    );
    expect(botService.createBot).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource query permission before testing a bot', async () => {
    const bot = serializeBot({ id: 1, enabledDataSources: [3] });
    botService.getBot.mockResolvedValue(bot);
    resourceAuthorization.canAccessBot.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().test(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '1' },
        body: { message: 'show revenue' },
      }),
    );

    expect(resourceAuthorization.canAccessBot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      bot,
      'datasource:query',
    );
    expect(botService.testBot).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource manage permission before regenerating a bot token', async () => {
    const bot = serializeBot({ id: 1, enabledDataSources: [3] });
    botService.getBot.mockResolvedValue(bot);
    resourceAuthorization.canAccessBot.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().regenerateToken(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '1' },
      }),
    );

    expect(resourceAuthorization.canAccessBot).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      bot,
      'datasource:manage',
    );
    expect(botService.regenerateToken).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
