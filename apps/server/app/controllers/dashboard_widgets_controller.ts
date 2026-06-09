import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DashboardWidgetService } from '../services/dashboard_widget_service.js';
import { DerivedResourceAuthorizationService } from '../services/derived_resource_authorization_service.js';
import {
  dashboardWidgetCreateSchema,
  dashboardWidgetUpdateSchema,
  dashboardLayoutUpdateSchema,
} from '../validators/dashboard.js';
import { toId } from '../utils/validation.js';
import Dashboard from '../models/dashboard.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { AuthorizationAction } from '../types/authorization.js';
import type { WidgetConfig } from '../models/dashboard_widget.js';

@inject()
export default class DashboardWidgetsController {
  constructor(
    private service: DashboardWidgetService,
    private resourceAuthorization: DerivedResourceAuthorizationService,
  ) {}

  private unauthorized(response: HttpContext['response']) {
    return response.forbidden({
      error: 'Forbidden',
      message: 'Authentication is required for dashboard widget access',
    });
  }

  private forbidden(response: HttpContext['response'], action: AuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  async store(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const dashboardId = toId(params.dashboardId);
    if (!dashboardId) {
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }

    // 验证 dashboard 存在
    const dashboard = await Dashboard.find(dashboardId);
    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDashboard(user, dashboard, 'datasource:manage'))
    ) {
      return this.forbidden(response, 'datasource:manage');
    }

    const parsed = dashboardWidgetCreateSchema.parse(request.body());
    if (
      !(await this.resourceAuthorization.canAccessWidgetConfig(
        user,
        parsed.type,
        parsed.config as WidgetConfig,
        'datasource:query',
      ))
    ) {
      return this.forbidden(response, 'datasource:query');
    }
    const record = await this.service.addWidget(dashboardId, {
      ...parsed,
      config: parsed.config as WidgetConfig,
    });
    return response.created(record);
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const dashboardId = toId(params.dashboardId);
    const widgetId = toId(params.id);
    if (!dashboardId || !widgetId) {
      return response.badRequest({ message: 'Invalid dashboard or widget ID' });
    }

    // 验证 dashboard 存在
    const dashboard = await Dashboard.find(dashboardId);
    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDashboard(user, dashboard, 'datasource:manage'))
    ) {
      return this.forbidden(response, 'datasource:manage');
    }

    const existing = await this.service.getWidget(widgetId);
    if (!existing) {
      return response.notFound({ message: 'Widget not found' });
    }

    const parsed = dashboardWidgetUpdateSchema.parse(request.body());
    if (parsed.config !== undefined || parsed.type !== undefined) {
      const type = parsed.type ?? existing.type;
      const config = (parsed.config ?? existing.config) as WidgetConfig;
      if (
        !(await this.resourceAuthorization.canAccessWidgetConfig(
          user,
          type,
          config,
          'datasource:query',
        ))
      ) {
        return this.forbidden(response, 'datasource:query');
      }
    }
    const record = await this.service.updateWidget(widgetId, {
      ...parsed,
      config: parsed.config as WidgetConfig | undefined,
    });
    return response.ok(record);
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    const dashboardId = toId(params.dashboardId);
    const widgetId = toId(params.id);
    if (!dashboardId || !widgetId) {
      return response.badRequest({ message: 'Invalid dashboard or widget ID' });
    }

    // 验证 dashboard 存在
    const dashboard = await Dashboard.find(dashboardId);
    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (
      !(await this.resourceAuthorization.canAccessDashboard(user, dashboard, 'datasource:manage'))
    ) {
      return this.forbidden(response, 'datasource:manage');
    }

    await this.service.removeWidget(widgetId);
    return response.noContent();
  }

  async updateLayout(ctx: HttpContext) {
    const { params, request, response } = ctx;
    try {
      const dashboardId = toId(params.dashboardId);
      if (!dashboardId) {
        return response.badRequest({ message: 'Invalid dashboard ID' });
      }

      // 验证 dashboard 存在
      const dashboard = await Dashboard.find(dashboardId);
      if (!dashboard) {
        return response.notFound({ message: 'Dashboard not found' });
      }

      const user = getAuthenticatedUser(ctx);
      if (!user) return this.unauthorized(response);
      if (
        !(await this.resourceAuthorization.canAccessDashboard(user, dashboard, 'datasource:manage'))
      ) {
        return this.forbidden(response, 'datasource:manage');
      }

      const parsed = dashboardLayoutUpdateSchema.parse(request.body());
      await this.service.updateLayout(dashboardId, parsed.layouts);
      return response.ok({ success: true });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return response.badRequest({
          message: 'Validation error',
          error: error.message,
        });
      }
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Failed to update layout',
      });
    }
  }

  async refresh(ctx: HttpContext) {
    const { params, response } = ctx;
    const dashboardId = toId(params.dashboardId);
    const widgetId = toId(params.id);
    if (!dashboardId || !widgetId) {
      return response.badRequest({ message: 'Invalid dashboard or widget ID' });
    }

    // 验证 dashboard 存在
    const dashboard = await Dashboard.find(dashboardId);
    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const widget = await this.service.getWidget(widgetId);
    if (!widget) {
      return response.notFound({ message: 'Widget not found' });
    }

    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);
    if (!(await this.resourceAuthorization.canAccessWidget(user, widget, 'datasource:query'))) {
      return this.forbidden(response, 'datasource:query');
    }

    try {
      const result = await this.service.refreshWidget(widgetId);
      return response.ok(result);
    } catch (error) {
      return response.badRequest({
        message: error instanceof Error ? error.message : 'Refresh failed',
      });
    }
  }
}
