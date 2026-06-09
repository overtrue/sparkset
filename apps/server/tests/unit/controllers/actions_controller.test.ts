import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import type { ActionExecutor } from '@sparkset/core';
import ActionsController from '../../../app/controllers/actions_controller.js';
import type { ActionService } from '../../../app/services/action_service.js';
import type { AIProviderService } from '../../../app/services/ai_provider_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';
import type { SchemaService } from '../../../app/services/schema_service.js';
import type { Action } from '../../../app/models/types.js';

interface ActionServiceMock {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  generateSQL: ReturnType<typeof vi.fn>;
}

interface ActionExecutorMock {
  run: ReturnType<typeof vi.fn>;
}

interface SchemaServiceMock {
  list: ReturnType<typeof vi.fn>;
}

interface AIProviderServiceMock {
  list: ReturnType<typeof vi.fn>;
}

interface AuthorizationServiceMock {
  can: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  ok: (payload: unknown) => unknown;
  created: (payload: unknown) => unknown;
  badRequest: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  forbidden: (payload: unknown) => unknown;
  notFound: (payload: unknown) => unknown;
  serviceUnavailable: (payload: unknown) => unknown;
  noContent: () => null;
  status: (code: number) => MockResponse;
  send: (payload: unknown) => unknown;
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
    unauthorized(payload) {
      response.statusCode = 401;
      response.payload = payload;
      return payload;
    },
    forbidden(payload) {
      response.statusCode = 403;
      response.payload = payload;
      return payload;
    },
    notFound(payload) {
      response.statusCode = 404;
      response.payload = payload;
      return payload;
    },
    serviceUnavailable(payload) {
      response.statusCode = 503;
      response.payload = payload;
      return payload;
    },
    noContent() {
      response.statusCode = 204;
      response.payload = null;
      return null;
    },
    status(code) {
      response.statusCode = code;
      return response;
    },
    send(payload) {
      response.payload = payload;
      return payload;
    },
  };
  return response;
};

const createMockContext = ({
  params,
  body,
  user,
  response,
}: {
  params?: Record<string, string | number>;
  body?: Record<string, unknown>;
  user?: { id: number; roles?: string[]; permissions?: string[]; isActive?: boolean };
  response: MockResponse;
}): HttpContext => {
  return {
    params: params ?? {},
    request: {
      body: () => body ?? {},
    },
    response,
    auth: user
      ? {
          user: {
            id: user.id,
            roles: user.roles ?? [],
            permissions: user.permissions ?? [],
            isActive: user.isActive ?? true,
          },
        }
      : undefined,
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  } as unknown as HttpContext;
};

const sqlAction = (input: Partial<Action> = {}): Action => ({
  id: input.id ?? 12,
  name: input.name ?? 'Dangerous SQL action',
  description: input.description,
  type: input.type ?? 'sql',
  payload: input.payload ?? {
    sql: 'delete from orders where id = :id',
    datasourceId: 3,
  },
  parameters: input.parameters ?? { id: 1 },
  inputSchema: input.inputSchema ?? { parameters: [] },
  createdAt: input.createdAt ?? new Date(),
  updatedAt: input.updatedAt ?? new Date(),
});

describe('ActionsController authorization', () => {
  let actionService: ActionServiceMock;
  let actionExecutor: ActionExecutorMock;
  let schemaService: SchemaServiceMock;
  let aiProviderService: AIProviderServiceMock;
  let authorizationService: AuthorizationServiceMock;
  let createController: () => ActionsController;

  beforeEach(() => {
    actionService = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      generateSQL: vi.fn(),
    };
    actionExecutor = {
      run: vi.fn().mockResolvedValue({ success: true, data: { rows: [] } }),
    };
    schemaService = {
      list: vi.fn().mockResolvedValue([{ tableName: 'orders', columns: [] }]),
    };
    aiProviderService = {
      list: vi.fn().mockResolvedValue([{ id: 1, name: 'OpenAI', isDefault: true }]),
    };
    authorizationService = {
      can: vi.fn().mockResolvedValue(true),
    };
    createController = () =>
      new ActionsController(
        actionService as unknown as ActionService,
        actionExecutor as unknown as ActionExecutor,
        schemaService as unknown as SchemaService,
        aiProviderService as unknown as AIProviderService,
        authorizationService as unknown as AuthorizationService,
      );
  });

  it('forbids SQL action execution without datasource manage permission', async () => {
    actionService.get.mockResolvedValue(sqlAction());
    authorizationService.can.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().execute(
      createMockContext({
        params: { id: '12' },
        body: { parameters: { id: 9 } },
        user: { id: 7 },
        response,
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:manage',
      { type: 'datasource', id: 3 },
    );
    expect(actionExecutor.run).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('rejects SQL action execution without an explicit datasource binding', async () => {
    actionService.get.mockResolvedValue(sqlAction({ payload: { sql: 'select 1' } }));
    const response = createMockResponse();

    await createController().execute(
      createMockContext({
        params: { id: '12' },
        user: { id: 7 },
        response,
      }),
    );

    expect(actionExecutor.run).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(400);
    expect(response.payload).toEqual({
      message: 'SQL actions must include payload.datasourceId',
    });
  });

  it('checks datasource query permission before generating SQL', async () => {
    authorizationService.can.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().generateSQL(
      createMockContext({
        body: {
          name: 'Top orders',
          description: 'Show top orders',
          datasourceId: 3,
        },
        user: { id: 7 },
        response,
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:query',
      { type: 'datasource', id: 3 },
    );
    expect(schemaService.list).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
