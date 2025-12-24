import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DashboardWidgetService } from '../services/dashboard_widget_service.js';
import {
  dashboardWidgetCreateSchema,
  dashboardWidgetUpdateSchema,
  dashboardLayoutUpdateSchema,
} from '../validators/dashboard.js';
import { toId } from '../utils/validation.js';
import Dashboard from '../models/dashboard.js';

@inject()
export default class DashboardWidgetsController {
  constructor(private service: DashboardWidgetService) {}

  async store({ params, request, response }: HttpContext) {
    const dashboardId = toId(params.dashboardId);
    if (!dashboardId) {
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }

    // 验证 dashboard 存在
    const dashboard = await Dashboard.find(dashboardId);
    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    const parsed = dashboardWidgetCreateSchema.parse(request.body());
    const record = await this.service.addWidget(dashboardId, {
      ...parsed,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: parsed.config as any,
    });
    return response.created(record);
  }

  async update({ params, request, response }: HttpContext) {
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

    const parsed = dashboardWidgetUpdateSchema.parse(request.body());
    const record = await this.service.updateWidget(widgetId, {
      ...parsed,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: parsed.config as any,
    });
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
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

    await this.service.removeWidget(widgetId);
    return response.noContent();
  }

  async updateLayout({ params, request, response }: HttpContext) {
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

  async refresh({ params, response }: HttpContext) {
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
