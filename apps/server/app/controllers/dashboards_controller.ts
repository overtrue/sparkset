import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DashboardService } from '../services/dashboard_service.js';
import { DerivedResourceAuthorizationService } from '../services/derived_resource_authorization_service.js';
import { dashboardCreateSchema, dashboardUpdateSchema } from '../validators/dashboard.js';
import { toId } from '../utils/validation.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { AuthorizationAction } from '../types/authorization.js';

@inject()
export default class DashboardsController {
  constructor(
    private service: DashboardService,
    private resourceAuthorization: DerivedResourceAuthorizationService,
  ) {}

  private unauthorized(response: HttpContext['response']) {
    return response.forbidden({
      error: 'Forbidden',
      message: 'Authentication is required for dashboard access',
    });
  }

  private forbidden(response: HttpContext['response'], action: AuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  async index(ctx: HttpContext) {
    const { response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    const items = await this.service.list();
    const authorizedItems = [];
    for (const item of items) {
      if (await this.resourceAuthorization.canAccessDashboard(user, item, 'datasource:view')) {
        authorizedItems.push(item);
      }
    }
    return response.ok({ items: authorizedItems });
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx;
    const parsed = dashboardCreateSchema.parse(request.body());
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
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
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }
    const dashboard = await this.service.get(id);

    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDashboard(user, dashboard, 'datasource:view'))
    ) {
      return this.forbidden(response, 'datasource:view');
    }

    return response.ok(dashboard);
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }
    const parsed = dashboardUpdateSchema.parse({ ...request.body(), id });
    const updateInput = {
      ...parsed,
      description: parsed.description ?? undefined,
    };

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDashboard(user, existing, 'datasource:manage'))
    ) {
      return this.forbidden(response, 'datasource:manage');
    }

    const record = await this.service.update(id, updateInput);
    return response.ok(record);
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDashboard(user, existing, 'datasource:manage'))
    ) {
      return this.forbidden(response, 'datasource:manage');
    }

    await this.service.delete(id);
    return response.noContent();
  }
}
