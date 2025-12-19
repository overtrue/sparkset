import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { AIProviderService } from '../services/ai_provider_service';
import {
  aiProviderCreateSchema,
  aiProviderUpdateSchema,
  setDefaultSchema,
} from '../validators/aiProvider';
import { toId } from '../utils/validation.js';

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
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid provider ID' });
    }
    await this.service.remove(id);
    return response.noContent();
  }

  async setDefault({ params, response }: HttpContext) {
    const parsed = setDefaultSchema.parse(params);
    const id = toId(parsed.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid provider ID' });
    }
    await this.service.setDefault(id);
    return response.ok({ success: true });
  }

  /**
   * 测试现有 Provider 的连通性
   */
  async testConnection({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid provider ID' });
    }
    const result = await this.service.testConnectionById(id);

    if (result.success) {
      return response.ok(result);
    } else {
      return response.badRequest(result);
    }
  }

  /**
   * 测试新 Provider 配置的连通性（不保存到数据库）
   */
  async testConnectionByConfig({ request, response }: HttpContext) {
    const body = request.body() as {
      type: string;
      apiKey?: string;
      baseURL?: string;
      defaultModel?: string;
    };

    if (!body.type) {
      return response.badRequest({ success: false, message: '缺少必要的配置参数: type' });
    }

    const result = await this.service.testConnection(body);

    if (result.success) {
      return response.ok(result);
    } else {
      return response.badRequest(result);
    }
  }
}
