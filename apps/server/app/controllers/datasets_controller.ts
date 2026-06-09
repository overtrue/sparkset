import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { z } from 'zod';
import { DatasetService } from '../services/dataset_service.js';
import { AuthorizationService } from '../services/authorization_service.js';
import { toId } from '../utils/validation.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { AuthorizationAction } from '../types/authorization.js';

const createSchema = z.object({
  datasourceId: z.number().int().positive(),
  name: z.string().min(1).max(128),
  description: z.string().nullable().optional(),
  querySql: z.string().min(1),
  schemaJson: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['quantitative', 'temporal', 'nominal', 'ordinal']),
    }),
  ),
});

const previewSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
});

@inject()
export default class DatasetsController {
  constructor(
    private service: DatasetService,
    private authorization: AuthorizationService,
  ) {}

  private unauthorized(response: HttpContext['response']) {
    return response.forbidden({
      error: 'Forbidden',
      message: 'Authentication is required for dataset access',
    });
  }

  private forbidden(response: HttpContext['response'], action: AuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  private async canAccess(ctx: HttpContext, datasourceId: number, action: AuthorizationAction) {
    const user = getAuthenticatedUser(ctx);
    if (!user) return false;
    return this.authorization.can(user, action, { type: 'datasource', id: datasourceId });
  }

  async index(ctx: HttpContext) {
    const { response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    const items = await this.service.list();
    const authorizedItems = [];
    for (const item of items) {
      const datasourceId = Number((item as { datasourceId?: number }).datasourceId);
      if (
        await this.authorization.can(user, 'datasource:view', {
          type: 'datasource',
          id: datasourceId,
        })
      ) {
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
    if (!(await this.canAccess(ctx, parsed.datasourceId, 'datasource:query'))) {
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
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const dataset = await this.service.get(id);

    if (!dataset) {
      return response.notFound({ message: 'Dataset not found' });
    }

    const datasourceId = Number(dataset.datasourceId);
    if (!(await this.canAccess(ctx, datasourceId, 'datasource:view'))) {
      return this.forbidden(response, 'datasource:view');
    }

    return response.ok(dataset);
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const parsed = createSchema.partial().parse(request.body());
    const updateInput = {
      ...parsed,
      description: parsed.description ?? undefined,
    };

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dataset not found' });
    }
    const datasourceId = Number(
      parsed.datasourceId ?? (existing as { datasourceId?: number }).datasourceId,
    );
    if (!(await this.canAccess(ctx, datasourceId, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }

    const record = await this.service.update(id, updateInput);
    return response.ok(record);
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dataset not found' });
    }
    const datasourceId = Number((existing as { datasourceId?: number }).datasourceId);
    if (!(await this.canAccess(ctx, datasourceId, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }

    await this.service.delete(id);
    return response.noContent();
  }

  async preview(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid dataset ID' });
    const parsed = previewSchema.parse(request.body());

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dataset not found' });
    }
    const datasourceId = Number((existing as { datasourceId?: number }).datasourceId);
    if (!(await this.canAccess(ctx, datasourceId, 'datasource:query'))) {
      return this.forbidden(response, 'datasource:query');
    }

    try {
      const result = await this.service.execute(id, parsed.params);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Execution failed',
      });
    }
  }
}
