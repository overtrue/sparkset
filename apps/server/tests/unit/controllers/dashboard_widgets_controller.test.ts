import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import DashboardWidgetsController from '../../../app/controllers/dashboard_widgets_controller.js';
import type { DashboardWidgetService } from '../../../app/services/dashboard_widget_service.js';
import type { DerivedResourceAuthorizationService } from '../../../app/services/derived_resource_authorization_service.js';

vi.mock('../../../app/models/dashboard.js', () => ({
  default: {
    find: vi.fn(),
  },
}));

import Dashboard from '../../../app/models/dashboard.js';

interface DashboardWidgetServiceMock {
  getWidget: ReturnType<typeof vi.fn>;
  addWidget: ReturnType<typeof vi.fn>;
  updateWidget: ReturnType<typeof vi.fn>;
  removeWidget: ReturnType<typeof vi.fn>;
  updateLayout: ReturnType<typeof vi.fn>;
  refreshWidget: ReturnType<typeof vi.fn>;
}

interface ResourceAuthorizationMock {
  canAccessDashboard: ReturnType<typeof vi.fn>;
  canAccessWidgetConfig: ReturnType<typeof vi.fn>;
  canAccessWidget: ReturnType<typeof vi.fn>;
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

describe('DashboardWidgetsController authorization', () => {
  let widgetService: DashboardWidgetServiceMock;
  let resourceAuthorization: ResourceAuthorizationMock;
  let createController: () => DashboardWidgetsController;

  beforeEach(() => {
    vi.mocked(Dashboard.find).mockReset();
    vi.mocked(Dashboard.find).mockResolvedValue({
      id: 1,
      title: 'Sales',
      widgets: [],
    } as unknown as Awaited<ReturnType<typeof Dashboard.find>>);
    widgetService = {
      getWidget: vi.fn(),
      addWidget: vi.fn(),
      updateWidget: vi.fn(),
      removeWidget: vi.fn(),
      updateLayout: vi.fn(),
      refreshWidget: vi.fn(),
    };
    resourceAuthorization = {
      canAccessDashboard: vi.fn().mockResolvedValue(true),
      canAccessWidgetConfig: vi.fn(),
      canAccessWidget: vi.fn(),
    };
    createController = () =>
      new DashboardWidgetsController(
        widgetService as unknown as DashboardWidgetService,
        resourceAuthorization as unknown as DerivedResourceAuthorizationService,
      );
  });

  it('requires datasource query permission before adding a dataset widget', async () => {
    resourceAuthorization.canAccessWidgetConfig.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().store(
      createMockContext({
        response,
        user: { id: 7 },
        params: { dashboardId: '1' },
        body: {
          title: 'Orders',
          type: 'dataset',
          x: 0,
          y: 0,
          w: 4,
          h: 3,
          config: { datasetId: 10 },
        },
      }),
    );

    expect(resourceAuthorization.canAccessWidgetConfig).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      'dataset',
      { datasetId: 10 },
      'datasource:query',
    );
    expect(widgetService.addWidget).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource query permission before refreshing a widget', async () => {
    const widget = { id: 20, type: 'chart', config: { chartId: 3 } };
    widgetService.getWidget.mockResolvedValue(widget);
    resourceAuthorization.canAccessWidget.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().refresh(
      createMockContext({
        response,
        user: { id: 7 },
        params: { dashboardId: '1', id: '20' },
      }),
    );

    expect(resourceAuthorization.canAccessWidget).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      widget,
      'datasource:query',
    );
    expect(widgetService.refreshWidget).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
