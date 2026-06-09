import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import type { DatasourceService } from '../../../app/services/datasource_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';

const userModelMock = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('#models/user', () => ({
  default: userModelMock,
}));

import AuthSubjectsController from '../../../app/controllers/auth_subjects_controller.js';

interface DatasourceServiceMock {
  get: ReturnType<typeof vi.fn>;
}

interface AuthorizationServiceMock {
  can: ReturnType<typeof vi.fn>;
}

interface MockResponse {
  statusCode: number;
  payload: unknown;
  ok: (payload: unknown) => unknown;
  badRequest: (payload: unknown) => unknown;
  unauthorized: (payload: unknown) => unknown;
  forbidden: (payload: unknown) => unknown;
  notFound: (payload: unknown) => unknown;
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
  };
  return response;
};

const createMockContext = ({
  params,
  user,
  response,
}: {
  params?: Record<string, string | number>;
  user?: { id: number; roles?: string[]; permissions?: string[]; isActive?: boolean };
  response: MockResponse;
}): HttpContext => {
  return {
    params: params ?? {},
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
  } as unknown as HttpContext;
};

const createUserQuery = (users: Record<string, unknown>[]) => {
  const query = {
    where: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    select: vi.fn(() => query),
    exec: vi.fn().mockResolvedValue(users),
    then(resolve: (value: Record<string, unknown>[]) => unknown) {
      return query.exec().then(resolve);
    },
  };
  return query;
};

describe('AuthSubjectsController', () => {
  let datasourceService: DatasourceServiceMock;
  let authorizationService: AuthorizationServiceMock;
  let createController: () => AuthSubjectsController;

  beforeEach(() => {
    userModelMock.query.mockReset();
    datasourceService = {
      get: vi.fn().mockResolvedValue({ id: 5 }),
    };
    authorizationService = {
      can: vi.fn().mockResolvedValue(true),
    };
    createController = () =>
      new AuthSubjectsController(
        datasourceService as unknown as DatasourceService,
        authorizationService as unknown as AuthorizationService,
      );
  });

  it('returns users and unique role summaries for datasource grant managers', async () => {
    userModelMock.query.mockReturnValue(
      createUserQuery([
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          displayName: 'Admin',
          provider: 'local',
          roles: ['admin'],
        },
        {
          id: 2,
          username: 'analyst',
          email: null,
          displayName: null,
          provider: 'local',
          roles: ['analyst', 'viewer'],
        },
        {
          id: 3,
          username: 'viewer',
          email: null,
          displayName: 'Viewer',
          provider: 'header',
          roles: ['viewer'],
        },
      ]),
    );
    const response = createMockResponse();

    await createController().index(
      createMockContext({
        response,
        params: { datasourceId: '5' },
        user: { id: 9, roles: ['admin'] },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9 }),
      'datasource:grant',
      { type: 'datasource', id: 5 },
    );
    expect(response.statusCode).toBe(200);
    expect(response.payload).toEqual({
      users: [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          displayName: 'Admin',
          provider: 'local',
          roles: ['admin'],
        },
        {
          id: 2,
          username: 'analyst',
          email: null,
          displayName: null,
          provider: 'local',
          roles: ['analyst', 'viewer'],
        },
        {
          id: 3,
          username: 'viewer',
          email: null,
          displayName: 'Viewer',
          provider: 'header',
          roles: ['viewer'],
        },
      ],
      roles: [
        { id: 'admin', name: 'admin', userCount: 1 },
        { id: 'analyst', name: 'analyst', userCount: 1 },
        { id: 'viewer', name: 'viewer', userCount: 2 },
      ],
    });
  });

  it('does not expose subjects without datasource grant permission', async () => {
    authorizationService.can.mockResolvedValue(false);
    userModelMock.query.mockReturnValue(createUserQuery([]));
    const response = createMockResponse();

    await createController().index(
      createMockContext({
        response,
        params: { datasourceId: '5' },
        user: { id: 9 },
      }),
    );

    expect(response.statusCode).toBe(403);
    expect(userModelMock.query).not.toHaveBeenCalled();
  });
});
