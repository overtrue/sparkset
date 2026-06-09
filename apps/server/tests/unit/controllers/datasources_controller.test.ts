import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import DatasourcesController from '../../../app/controllers/datasources_controller.js';
import type { DatasourceService } from '../../../app/services/datasource_service.js';
import type { SchemaService } from '../../../app/services/schema_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';
import type { DataSource } from '../../../app/models/types.js';

interface DatasourceServiceMock {
  listAuthorized: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  setDefault: ReturnType<typeof vi.fn>;
  listGrants: ReturnType<typeof vi.fn>;
}

interface SchemaServiceMock {
  sync: ReturnType<typeof vi.fn>;
  list: ReturnType<typeof vi.fn>;
  updateTableMetadata: ReturnType<typeof vi.fn>;
  updateColumnMetadata: ReturnType<typeof vi.fn>;
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
  noContent: () => null;
}

const datasource = (input: Partial<DataSource> = {}): DataSource => ({
  id: input.id ?? 1,
  name: input.name ?? 'Main',
  type: input.type ?? 'mysql',
  host: input.host ?? 'localhost',
  port: input.port ?? 3306,
  username: input.username ?? 'root',
  password: input.password ?? 'secret',
  database: input.database ?? 'sparkset',
  isDefault: input.isDefault ?? true,
  creatorId: input.creatorId ?? 1,
  updaterId: input.updaterId ?? 1,
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
    notFound(payload) {
      response.statusCode = 404;
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
  } as unknown as HttpContext;
};

describe('DatasourcesController authorization', () => {
  let datasourceService: DatasourceServiceMock;
  let schemaService: SchemaServiceMock;
  let authorizationService: AuthorizationServiceMock;
  let createController: () => DatasourcesController;

  beforeEach(() => {
    datasourceService = {
      listAuthorized: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      setDefault: vi.fn(),
      listGrants: vi.fn(),
    };
    schemaService = {
      sync: vi.fn(),
      list: vi.fn(),
      updateTableMetadata: vi.fn(),
      updateColumnMetadata: vi.fn(),
    };
    authorizationService = {
      can: vi.fn(),
    };
    createController = () =>
      new DatasourcesController(
        datasourceService as unknown as DatasourceService,
        schemaService as unknown as SchemaService,
        {} as never,
        authorizationService as unknown as AuthorizationService,
      );
  });

  it('lists only datasources visible to the authenticated user', async () => {
    const response = createMockResponse();
    const visibleDatasource = datasource({ id: 2 });
    datasourceService.listAuthorized.mockResolvedValue([visibleDatasource]);
    const controller = createController();

    await controller.index(
      createMockContext({
        response,
        user: { id: 7, roles: ['analyst'] },
      }),
    );

    expect(datasourceService.listAuthorized).toHaveBeenCalledWith({
      id: 7,
      roles: ['analyst'],
      permissions: [],
      isActive: true,
    });
    expect(response.statusCode).toBe(200);
    expect((response.payload as { items: unknown[] }).items).toHaveLength(1);
  });

  it('returns forbidden when the user cannot view a datasource', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    authorizationService.can.mockResolvedValue(false);
    const controller = createController();

    await controller.show(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:view',
      { type: 'datasource', id: 5 },
    );
    expect(response.statusCode).toBe(403);
  });

  it('requires sync_schema permission before syncing a datasource', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    authorizationService.can.mockResolvedValue(false);
    const controller = createController();

    await controller.sync(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
      }),
    );

    expect(schemaService.sync).not.toHaveBeenCalled();
    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:sync_schema',
      { type: 'datasource', id: 5 },
    );
    expect(response.statusCode).toBe(403);
  });

  it('requires manage_credentials permission when updating datasource connection settings', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    datasourceService.update.mockResolvedValue(datasource({ id: 5, password: 'rotated' }));
    authorizationService.can.mockImplementation((_user, action) => action === 'datasource:manage');
    const controller = createController();

    await controller.update(
      createMockContext({
        response,
        params: { id: '5' },
        body: { password: 'rotated' },
        user: { id: 7 },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:manage_credentials',
      { type: 'datasource', id: 5 },
    );
    expect(datasourceService.update).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('allows datasource display updates without manage_credentials permission', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    datasourceService.update.mockResolvedValue(datasource({ id: 5, name: 'Renamed' }));
    authorizationService.can.mockImplementation((_user, action) => action === 'datasource:manage');
    const controller = createController();

    await controller.update(
      createMockContext({
        response,
        params: { id: '5' },
        body: { name: 'Renamed' },
        user: { id: 7 },
      }),
    );

    expect(authorizationService.can).not.toHaveBeenCalledWith(
      expect.anything(),
      'datasource:manage_credentials',
      expect.anything(),
    );
    expect(datasourceService.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, name: 'Renamed' }),
      expect.objectContaining({ id: 7 }),
    );
    expect(response.statusCode).toBe(200);
  });

  it('requires manage_credentials permission before testing a saved datasource connection', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    authorizationService.can.mockImplementation((_user, action) => action === 'datasource:view');
    const controller = createController();

    await controller.testConnection(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:manage_credentials',
      { type: 'datasource', id: 5 },
    );
    expect(response.statusCode).toBe(403);
  });

  it('does not update table metadata when the table is not in the requested datasource', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    authorizationService.can.mockResolvedValue(true);
    schemaService.list.mockResolvedValue([]);
    const controller = createController();

    await controller.updateTableMetadata(
      createMockContext({
        response,
        params: { id: '5', tableId: '99' },
        body: { semanticDescription: 'User account table' },
        user: { id: 7 },
      }),
    );

    expect(schemaService.updateTableMetadata).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
  });

  it('does not update column metadata when the column is not in the requested datasource', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    authorizationService.can.mockResolvedValue(true);
    schemaService.list.mockResolvedValue([
      {
        id: 10,
        datasourceId: 5,
        tableName: 'users',
        columns: [{ id: 11, name: 'id', type: 'int' }],
        updatedAt: new Date(),
      },
    ]);
    const controller = createController();

    await controller.updateColumnMetadata(
      createMockContext({
        response,
        params: { id: '5', columnId: '99' },
        body: { semanticDescription: 'User name' },
        user: { id: 7 },
      }),
    );

    expect(schemaService.updateColumnMetadata).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
  });

  it('allows read-only grant listing for datasource viewers', async () => {
    const response = createMockResponse();
    datasourceService.get.mockResolvedValue(datasource({ id: 5 }));
    datasourceService.listGrants.mockResolvedValue([
      {
        id: 1,
        datasourceId: 5,
        subjectType: 'role',
        subjectId: 'analyst',
        permissions: ['datasource:view'],
      },
    ]);
    authorizationService.can.mockImplementation((_user, action) => action === 'datasource:view');
    const controller = createController();

    await controller.grants(
      createMockContext({
        response,
        params: { id: '5' },
        user: { id: 7 },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:view',
      { type: 'datasource', id: 5 },
    );
    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:grant',
      { type: 'datasource', id: 5 },
    );
    expect(response.payload).toEqual({
      items: [
        {
          id: 1,
          datasourceId: 5,
          subjectType: 'role',
          subjectId: 'analyst',
          permissions: ['datasource:view'],
        },
      ],
      canManage: false,
    });
  });
});
