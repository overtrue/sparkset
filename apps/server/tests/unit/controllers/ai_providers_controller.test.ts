import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import AIProvidersController from '../../../app/controllers/ai_providers_controller.js';
import type { AIProviderService } from '../../../app/services/ai_provider_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';
import type { AIProvider } from '../../../app/models/types.js';

interface AIProviderServiceMock {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setDefault: ReturnType<typeof vi.fn>;
  testConnection: ReturnType<typeof vi.fn>;
  testConnectionById: ReturnType<typeof vi.fn>;
}

interface AuthorizationServiceMock {
  canPerformGlobalAction: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  ok: (payload: unknown) => unknown;
  created: (payload: unknown) => unknown;
  badRequest: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  forbidden: (payload: unknown) => unknown;
  noContent: () => null;
}

const provider = (input: Partial<AIProvider> = {}): AIProvider => ({
  id: input.id ?? 1,
  name: input.name ?? 'OpenAI',
  type: input.type ?? 'openai',
  apiKey: input.apiKey ?? 'sk-secret',
  baseURL: input.baseURL ?? 'https://api.openai.com/v1',
  defaultModel: input.defaultModel ?? 'gpt-4o-mini',
  isDefault: input.isDefault ?? true,
  createdAt: input.createdAt ?? new Date(),
  updatedAt: input.updatedAt ?? new Date(),
});

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
  user,
  response,
}: {
  params?: Record<string, string | number>;
  body?: Record<string, unknown>;
  user?: { id: number; roles?: string[]; permissions?: string[]; isActive?: boolean };
  response: MockResponse;
}): HttpContext =>
  ({
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
  }) as unknown as HttpContext;

describe('AIProvidersController authorization', () => {
  let aiProviderService: AIProviderServiceMock;
  let authorizationService: AuthorizationServiceMock;
  let createController: () => AIProvidersController;

  beforeEach(() => {
    aiProviderService = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      testConnection: vi.fn(),
      testConnectionById: vi.fn(),
    };
    authorizationService = {
      canPerformGlobalAction: vi.fn(),
    };
    createController = () =>
      new AIProvidersController(
        aiProviderService as unknown as AIProviderService,
        authorizationService as unknown as AuthorizationService,
      );
  });

  it('lists provider summaries only for ai_provider:view users and includes capabilities', async () => {
    const response = createMockResponse();
    aiProviderService.list.mockResolvedValue([provider({ id: 5 })]);
    authorizationService.canPerformGlobalAction.mockImplementation((_user, action) =>
      ['ai_provider:view', 'ai_provider:manage'].includes(String(action)),
    );

    await createController().index(
      createMockContext({
        response,
        user: { id: 7 },
      }),
    );

    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual({
      items: [
        expect.objectContaining({
          id: 5,
          hasApiKey: true,
        }),
      ],
      capabilities: {
        canView: true,
        canManage: true,
        canManageCredentials: false,
      },
    });
    expect(JSON.stringify(response.payload)).not.toContain('sk-secret');
  });

  it('rejects listing providers without ai_provider:view', async () => {
    const response = createMockResponse();
    authorizationService.canPerformGlobalAction.mockReturnValue(false);

    await createController().index(
      createMockContext({
        response,
        user: { id: 7 },
      }),
    );

    expect(aiProviderService.list).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires ai_provider:manage_credentials before creating a provider', async () => {
    const response = createMockResponse();
    authorizationService.canPerformGlobalAction.mockImplementation(
      (_user, action) => action === 'ai_provider:manage',
    );

    await createController().store(
      createMockContext({
        response,
        user: { id: 7 },
        body: {
          name: 'OpenAI',
          type: 'openai',
          apiKey: 'sk-secret',
          defaultModel: 'gpt-4o-mini',
          isDefault: false,
        },
      }),
    );

    expect(aiProviderService.create).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires ai_provider:manage_credentials when updating connection settings', async () => {
    const response = createMockResponse();
    authorizationService.canPerformGlobalAction.mockImplementation(
      (_user, action) => action === 'ai_provider:manage',
    );

    await createController().update(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
        body: {
          apiKey: 'rotated-secret',
        },
      }),
    );

    expect(aiProviderService.update).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('allows display-only updates with ai_provider:manage', async () => {
    const response = createMockResponse();
    aiProviderService.update.mockResolvedValue(provider({ id: 5, name: 'Renamed' }));
    authorizationService.canPerformGlobalAction.mockImplementation(
      (_user, action) => action === 'ai_provider:manage',
    );

    await createController().update(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
        body: { name: 'Renamed' },
      }),
    );

    expect(aiProviderService.update).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));
    expect(response.statusCode).toBe(200);
  });

  it('requires ai_provider:manage_credentials before testing an unsaved provider config', async () => {
    const response = createMockResponse();
    authorizationService.canPerformGlobalAction.mockReturnValue(false);

    await createController().testConnectionByConfig(
      createMockContext({
        response,
        user: { id: 7 },
        body: {
          type: 'openai',
          apiKey: 'sk-secret',
          defaultModel: 'gpt-4o-mini',
        },
      }),
    );

    expect(aiProviderService.testConnection).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires ai_provider:manage before deleting a provider', async () => {
    const response = createMockResponse();
    authorizationService.canPerformGlobalAction.mockReturnValue(false);

    await createController().destroy(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
      }),
    );

    expect(aiProviderService.remove).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
