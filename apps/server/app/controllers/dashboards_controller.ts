import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { DashboardService } from '../services/dashboard_service.js';
import { dashboardCreateSchema, dashboardUpdateSchema } from '../validators/dashboard.js';
import { toId } from '../utils/validation.js';

@inject()
export default class DashboardsController {
  constructor(private service: DashboardService) {}

  async index({ response }: HttpContext) {
    const items = await this.service.list();
    return response.ok({ items });
  }

  async store({ request, response }: HttpContext) {
    const parsed = dashboardCreateSchema.parse(request.body());
    const record = await this.service.create({
      ...parsed,
      description: parsed.description ?? undefined,
      ownerId: undefined, // No auth yet
    });
    return response.created(record);
  }

  async show({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }
    const dashboard = await this.service.get(id);

    if (!dashboard) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    return response.ok(dashboard);
  }

  async update({ params, request, response }: HttpContext) {
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

    const record = await this.service.update(id, updateInput);
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid dashboard ID' });
    }

    const existing = await this.service.get(id);
    if (!existing) {
      return response.notFound({ message: 'Dashboard not found' });
    }

    await this.service.delete(id);
    return response.noContent();
  }
}
