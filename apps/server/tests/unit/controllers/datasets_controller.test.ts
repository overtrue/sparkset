import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import DatasetsController from '../../../app/controllers/datasets_controller.js';
import type { DatasetService } from '../../../app/services/dataset_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';

interface DatasetServiceMock {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
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
  forbidden: (payload: unknown) => unknown;
  notFound: (payload: unknown) => unknown;
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
  user?: { id: number; roles?: string[]; permissions?: string[] };
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
            isActive: true,
          },
        }
      : undefined,
  } as unknown as HttpContext;
};

describe('DatasetsController authorization', () => {
  let datasetService: DatasetServiceMock;
  let authorizationService: AuthorizationServiceMock;
  let createController: () => DatasetsController;

  beforeEach(() => {
    datasetService = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      execute: vi.fn(),
    };
    authorizationService = {
      can: vi.fn(),
    };
    createController = () =>
      new DatasetsController(
        datasetService as unknown as DatasetService,
        authorizationService as unknown as AuthorizationService,
      );
  });

  it('requires datasource query permission before creating a dataset', async () => {
    authorizationService.can.mockResolvedValue(false);
    const response = createMockResponse();
    const controller = createController();

    await controller.store(
      createMockContext({
        response,
        user: { id: 7 },
        body: {
          datasourceId: 3,
          name: 'Orders',
          querySql: 'select * from orders',
          schemaJson: [{ name: 'id', type: 'quantitative' }],
        },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:query',
      { type: 'datasource', id: 3 },
    );
    expect(datasetService.create).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('lists only datasets backed by viewable datasources', async () => {
    datasetService.list.mockResolvedValue([
      { id: 10, datasourceId: 3, name: 'Orders' },
      { id: 11, datasourceId: 4, name: 'Finance' },
    ]);
    authorizationService.can.mockImplementation((_user, _action, resource) =>
      Promise.resolve(resource.id === 3),
    );
    const response = createMockResponse();
    const controller = createController();

    await controller.index(
      createMockContext({
        response,
        user: { id: 7 },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:view',
      { type: 'datasource', id: 3 },
    );
    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:view',
      { type: 'datasource', id: 4 },
    );
    expect(response.payload).toEqual({
      items: [{ id: 10, datasourceId: 3, name: 'Orders' }],
    });
  });

  it('requires datasource view permission before showing a dataset', async () => {
    datasetService.get.mockResolvedValue({
      id: 10,
      datasourceId: 3,
      name: 'Orders',
    });
    authorizationService.can.mockResolvedValue(false);
    const response = createMockResponse();
    const controller = createController();

    await controller.show(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '10' },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:view',
      { type: 'datasource', id: 3 },
    );
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource manage permission before deleting a dataset', async () => {
    datasetService.get.mockResolvedValue({
      id: 10,
      datasourceId: 3,
      name: 'Orders',
    });
    authorizationService.can.mockResolvedValue(false);
    const response = createMockResponse();
    const controller = createController();

    await controller.destroy(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '10' },
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:manage',
      { type: 'datasource', id: 3 },
    );
    expect(datasetService.delete).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource query permission before previewing a dataset', async () => {
    datasetService.get.mockResolvedValue({
      id: 10,
      datasourceId: 3,
      name: 'Orders',
    });
    authorizationService.can.mockResolvedValue(false);
    const response = createMockResponse();
    const controller = createController();

    await controller.preview(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '10' },
        body: {},
      }),
    );

    expect(authorizationService.can).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'datasource:query',
      { type: 'datasource', id: 3 },
    );
    expect(datasetService.execute).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
