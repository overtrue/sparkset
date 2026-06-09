import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpContext } from '@adonisjs/core/http';
import ChartsController from '../../../app/controllers/charts_controller.js';
import type { ChartService } from '../../../app/services/chart_service.js';
import type { DerivedResourceAuthorizationService } from '../../../app/services/derived_resource_authorization_service.js';

interface ChartServiceMock {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  preview: ReturnType<typeof vi.fn>;
}

interface ResourceAuthorizationMock {
  canAccessChart: ReturnType<typeof vi.fn>;
  canAccessDataset: ReturnType<typeof vi.fn>;
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

const chartSpec = {
  specVersion: '1.0' as const,
  chartType: 'bar' as const,
  encoding: {
    y: [{ field: 'revenue', type: 'quantitative' as const, agg: 'sum' as const }],
  },
};

describe('ChartsController authorization', () => {
  let chartService: ChartServiceMock;
  let resourceAuthorization: ResourceAuthorizationMock;
  let createController: () => ChartsController;

  beforeEach(() => {
    chartService = {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      render: vi.fn(),
      preview: vi.fn(),
    };
    resourceAuthorization = {
      canAccessChart: vi.fn(),
      canAccessDataset: vi.fn(),
    };
    createController = () =>
      new ChartsController(
        chartService as unknown as ChartService,
        resourceAuthorization as unknown as DerivedResourceAuthorizationService,
      );
  });

  it('lists only charts backed by viewable datasources', async () => {
    const charts = [
      { id: 1, datasetId: 10, title: 'Orders' },
      { id: 2, datasetId: 11, title: 'Finance' },
    ];
    chartService.list.mockResolvedValue(charts);
    resourceAuthorization.canAccessChart.mockImplementation((_user, chart) =>
      Promise.resolve(chart.id === 1),
    );
    const response = createMockResponse();

    await createController().index(createMockContext({ response, user: { id: 7 } }));

    expect(resourceAuthorization.canAccessChart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      charts[0],
      'datasource:view',
    );
    expect(resourceAuthorization.canAccessChart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      charts[1],
      'datasource:view',
    );
    expect(response.payload).toEqual({ items: [charts[0]] });
  });

  it('requires datasource query permission before previewing chart data', async () => {
    resourceAuthorization.canAccessDataset.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().preview(
      createMockContext({
        response,
        user: { id: 7 },
        body: {
          datasetRef: { datasetId: 10 },
          spec: chartSpec,
        },
      }),
    );

    expect(resourceAuthorization.canAccessDataset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      10,
      'datasource:query',
    );
    expect(chartService.preview).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource query permission before rendering chart data', async () => {
    const chart = { id: 1, datasetId: 10, title: 'Orders' };
    chartService.get.mockResolvedValue(chart);
    resourceAuthorization.canAccessChart.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().render(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '1' },
        query: { useCache: 'false' },
      }),
    );

    expect(resourceAuthorization.canAccessChart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      chart,
      'datasource:query',
    );
    expect(chartService.render).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });

  it('requires datasource manage permission before deleting a chart', async () => {
    const chart = { id: 1, datasetId: 10, title: 'Orders' };
    chartService.get.mockResolvedValue(chart);
    resourceAuthorization.canAccessChart.mockResolvedValue(false);
    const response = createMockResponse();

    await createController().destroy(
      createMockContext({
        response,
        user: { id: 7 },
        params: { id: '1' },
      }),
    );

    expect(resourceAuthorization.canAccessChart).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      chart,
      'datasource:manage',
    );
    expect(chartService.delete).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
