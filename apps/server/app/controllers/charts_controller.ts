import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ChartService } from '../services/chart_service.js';
import { DerivedResourceAuthorizationService } from '../services/derived_resource_authorization_service.js';
import { z } from 'zod';
import { toId } from '../utils/validation.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { AuthorizationAction } from '../types/authorization.js';

const createSchema = z.object({
  datasetId: z.number().int().positive(),
  title: z.string().min(1).max(128),
  description: z.string().nullable().optional(),
  chartType: z.enum(['line', 'bar', 'area', 'pie', 'radar', 'radial', 'table']),
  spec: z.object({
    specVersion: z.literal('1.0'),
    chartType: z.enum(['line', 'bar', 'area', 'pie', 'radar', 'radial', 'table']),
    variant: z.string().optional(),
    encoding: z.object({
      x: z
        .object({
          field: z.string(),
          type: z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']),
          label: z.string().optional(),
        })
        .optional(),
      y: z.array(
        z.object({
          field: z.string(),
          type: z.literal('quantitative'),
          agg: z.enum(['sum', 'avg', 'min', 'max', 'count']),
          label: z.string().optional(),
          color: z.string().optional(),
        }),
      ),
      series: z
        .object({
          field: z.string(),
          type: z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']),
        })
        .optional(),
    }),
    transform: z
      .array(
        z.object({
          op: z.enum(['filter', 'timeBucket', 'sort', 'limit']),
        }),
      )
      .optional(),
    style: z
      .object({
        showLegend: z.boolean().optional(),
        showTooltip: z.boolean().optional(),
        showGrid: z.boolean().optional(),
        stacked: z.boolean().optional(),
        smooth: z.boolean().optional(),
        aspectRatio: z.number().optional(),
        horizontal: z.boolean().optional(),
        gradient: z.boolean().optional(),
        showDots: z.boolean().optional(),
        curveType: z.string().optional(),
        innerRadius: z.number().optional(),
        outerRadius: z.number().optional(),
      })
      .optional(),
  }),
});

const previewSchema = z.object({
  datasetRef: z.object({
    datasetId: z.number().int().positive(),
  }),
  spec: createSchema.shape.spec,
});

@inject()
export default class ChartsController {
  constructor(
    private service: ChartService,
    private resourceAuthorization: DerivedResourceAuthorizationService,
  ) {}

  private unauthorized(response: HttpContext['response']) {
    return response.forbidden({
      error: 'Forbidden',
      message: 'Authentication is required for chart access',
    });
  }

  private forbidden(response: HttpContext['response'], action: AuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  async index(ctx: HttpContext) {
    const { request, response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    const datasetId = request.input('datasetId') ? Number(request.input('datasetId')) : undefined;

    if (
      datasetId &&
      !(await this.resourceAuthorization.canAccessDataset(user, datasetId, 'datasource:view'))
    ) {
      return response.ok({ items: [] });
    }

    const items = await this.service.list(datasetId);
    const authorizedItems = [];
    for (const item of items) {
      if (await this.resourceAuthorization.canAccessChart(user, item, 'datasource:view')) {
        authorizedItems.push(item);
      }
    }
    return response.ok({ items: authorizedItems });
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx;
    const parsed = createSchema.parse(request.body());
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDataset(
        user,
        parsed.datasetId,
        'datasource:query',
      ))
    ) {
      return this.forbidden(response, 'datasource:query');
    }
    const record = await this.service.create({
      ...parsed,
      description: parsed.description ?? undefined,
      ownerId: user.id,
    });
    return response.created(record);
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }
    const chart = await this.service.get(id);

    if (!chart) {
      return response.notFound({ message: 'Chart not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (!(await this.resourceAuthorization.canAccessChart(user, chart, 'datasource:view'))) {
      return this.forbidden(response, 'datasource:view');
    }

    return response.ok(chart);
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }
    const parsed = createSchema.partial().parse(request.body());
    const updateInput = {
      ...parsed,
      description: parsed.description ?? undefined,
    };

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Chart not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (!(await this.resourceAuthorization.canAccessChart(user, existing, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    if (
      parsed.datasetId &&
      !(await this.resourceAuthorization.canAccessDataset(
        user,
        parsed.datasetId,
        'datasource:query',
      ))
    ) {
      return this.forbidden(response, 'datasource:query');
    }

    const record = await this.service.update(id, updateInput);
    return response.ok(record);
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Chart not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (!(await this.resourceAuthorization.canAccessChart(user, existing, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }

    await this.service.delete(id);
    return response.noContent();
  }

  async render(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid chart ID' });
    }
    const useCache = request.input('useCache', 'true') === 'true';

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Chart not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (!(await this.resourceAuthorization.canAccessChart(user, existing, 'datasource:query'))) {
      return this.forbidden(response, 'datasource:query');
    }

    try {
      const result = await this.service.render(id, useCache);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Render failed',
      });
    }
  }

  async preview(ctx: HttpContext) {
    const { request, response } = ctx;
    const parsed = previewSchema.parse(request.body());
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDataset(
        user,
        parsed.datasetRef.datasetId,
        'datasource:query',
      ))
    ) {
      return this.forbidden(response, 'datasource:query');
    }

    try {
      const result = await this.service.preview(parsed.datasetRef.datasetId, parsed.spec);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Preview failed',
      });
    }
  }
}
