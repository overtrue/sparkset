import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { AIProviderService } from '../services/ai_provider_service';
import {
  aiProviderCreateSchema,
  aiProviderUpdateSchema,
  setDefaultSchema,
} from '../validators/aiProvider';

@inject()
export default class AIProvidersController {
  constructor(private service: AIProviderService) {}

  async index({ response }: HttpContext) {
    const items = await this.service.list();
    return response.ok({ items });
  }

  async store({ request, response }: HttpContext) {
    const parsed = aiProviderCreateSchema.parse(request.body());
    const record = await this.service.create(parsed);
    return response.created(record);
  }

  async update({ params, request, response }: HttpContext) {
    const parsed = aiProviderUpdateSchema.parse({ ...request.body(), ...params });
    const record = await this.service.update(parsed);
    return response.ok(record);
  }

  async destroy({ params, response }: HttpContext) {
    const id = Number(params.id);
    await this.service.remove(id);
    return response.noContent();
  }

  async setDefault({ params, response }: HttpContext) {
    const parsed = setDefaultSchema.parse(params);
    await this.service.setDefault(parsed.id);
    return response.ok({ success: true });
  }
}
