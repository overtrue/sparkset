import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import DashboardsController from '../../../app/controllers/dashboards_controller.js';
import type { DashboardService } from '../../../app/services/dashboard_service.js';
import type { DerivedResourceAuthorizationService } from '../../../app/services/derived_resource_authorization_service.js';

interface DashboardServiceMock {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

interface ResourceAuthorizationMock {
  canAccessDashboard: ReturnType<typeof vi.fn>;
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

describe('DashboardsController authorization', () => {
  let dashboardService: DashboardServiceMock;
  let resourceAuthorization: ResourceAuthorizationMock;
  let createController: () => DashboardsController;

  beforeEach(() => {
    dashboardService = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    resourceAuthorization = {
      canAccessDashboard: vi.fn(),
    };
    createController = () =>
      new DashboardsController(
        dashboardService as unknown as DashboardService,
        resourceAuthorization as unknown as DerivedResourceAuthorizationService,
      );
  });

  it('lists only dashboards whose datasource-backed widgets are viewable', async () => {
    const dashboards = [
      { id: 1, title: 'Sales', widgets: [] },
      { id: 2, title: 'Finance', widgets: [] },
    ];
    dashboardService.list.mockResolvedValue(dashboards);
    resourceAuthorization.canAccessDashboard.mockImplementation(
      (_user, dashboard) => dashboard.id === 1,
    );
    const response = createMockResponse();

    await createController().index(createMockContext({ response, user: { id: 7 } }));

    expect(resourceAuthorization.canAccessDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      dashboards[0],
      'datasource:view',
    );
    expect(resourceAuthorization.canAccessDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      dashboards[1],
      'datasource:view',
    );
    expect(response.payload).toEqual({ items: [dashboards[0]] });
  });

  it('requires datasource view permission before showing a dashboard', async () => {
    const dashboard = { id: 1, title: 'Sales', widgets: [] };
    dashboardService.get.mockResolvedValue(dashboard);
    resourceAuthorization.canAccessDashboard.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().show(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '1' },
      }),
    );

    expect(resourceAuthorization.canAccessDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      dashboard,
      'datasource:view',
    );
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource manage permission before deleting a dashboard', async () => {
    const dashboard = { id: 1, title: 'Sales', widgets: [] };
    dashboardService.get.mockResolvedValue(dashboard);
    resourceAuthorization.canAccessDashboard.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().destroy(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '1' },
      }),
    );

    expect(resourceAuthorization.canAccessDashboard).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      dashboard,
      'datasource:manage',
    );
    expect(dashboardService.delete).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
