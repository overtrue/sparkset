import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ActionExecutor } from '@sparkset/core';
import { ActionService } from '../services/action_service';
import { AIProviderService } from '../services/ai_provider_service';
import { SchemaService } from '../services/schema_service';
import { actionCreateSchema, actionUpdateSchema } from '../validators/action';
import { toId } from '../utils/validation.js';

@inject()
export default class ActionsController {
  constructor(
    private service: ActionService,
    private actionExecutor?: ActionExecutor,
    private schemaService?: SchemaService,
    private aiProviderService?: AIProviderService,
  ) {}

  async index({ response }: HttpContext) {
    const items = await this.service.list();
    return response.ok({ items });
  }

  async show({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid action ID' });
    const item = await this.service.get(id);
    if (!item) return response.notFound({ message: 'Action not found' });
    return response.ok(item);
  }

  async store({ request, response }: HttpContext) {
    const parsed = actionCreateSchema.parse(request.body());
    const item = await this.service.create({
      ...parsed,
      description: parsed.description ?? undefined,
    });
    return response.created(item);
  }

  async update({ params, request, response }: HttpContext) {
    const parsed = actionUpdateSchema.parse({ ...request.body(), ...params });
    const item = await this.service.update({
      ...parsed,
      description: parsed.description ?? undefined,
    });
    return response.ok(item);
  }

  async destroy({ params, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid action ID' });
    await this.service.remove(id);
    return response.noContent();
  }

  async execute({ params, request, response }: HttpContext) {
    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid action ID' });
    const item = await this.service.get(id);
    if (!item) return response.notFound({ message: 'Action not found' });
    if (!this.actionExecutor)
      return response.ok({ message: 'Action executed (stub)', action: item });

    // 从请求体中获取 parameters，如果没有则使用 Action 中存储的 parameters
    const requestParameters = (request.body() as { parameters?: unknown })?.parameters;
    const parameters = requestParameters !== undefined ? requestParameters : item.parameters;

    const result = await this.actionExecutor.run({
      id: item.id,
      type: item.type,
      payload: item.payload,
      parameters,
    });
    if (!result.success) {
      return response.status(400).send({ message: result.error?.message ?? 'Execution failed' });
    }
    return response.ok({ actionId: item.id, result: result.data });
  }

  async generateSQL({ request, response, logger }: HttpContext) {
    if (!this.schemaService) {
      return response.status(500).send({ message: 'Schema service not available' });
    }
    if (!this.aiProviderService) {
      return response.status(500).send({ message: 'AI provider service not available' });
    }

    const body = request.body() as {
      name: string;
      description?: string;
      datasourceId: number;
      aiProviderId?: number;
    };

    if (!body.name || !body.datasourceId) {
      return response.status(400).send({
        message: 'Missing required fields: name, datasourceId',
      });
    }

    try {
      // 获取数据源 Schema
      const schemas = await this.schemaService.list(body.datasourceId);
      if (schemas.length === 0) {
        return response.status(400).send({
          message: `No tables found in datasource ${body.datasourceId}. Please sync the datasource schema first.`,
        });
      }

      // 获取 AI Provider
      const providers = await this.aiProviderService.list();
      let aiProvider = body.aiProviderId ? providers.find((p) => p.id === body.aiProviderId) : null;

      if (!aiProvider) {
        aiProvider = providers.find((p) => p.isDefault);
      }

      if (!aiProvider) {
        return response.status(400).send({
          message: 'No AI provider available. Please configure an AI provider first.',
        });
      }

      // 生成 SQL
      const logAdapter = {
        info: (...args: unknown[]) =>
          (logger as unknown as { info: (...args: unknown[]) => void }).info(...args),
        warn: (...args: unknown[]) =>
          (logger as unknown as { warn: (...args: unknown[]) => void }).warn(...args),
        error: (...args: unknown[]) =>
          (logger as unknown as { error: (...args: unknown[]) => void }).error(...args),
      };

      const result = await this.service.generateSQL(
        body.name,
        body.description || '',
        body.datasourceId,
        {
          schemas,
          aiProvider,
          logger: logAdapter,
        },
      );

      return response.ok(result);
    } catch (error) {
      logger.error(error instanceof Error ? error : new Error(String(error)), 'Generate SQL error');
      // 根据错误类型返回适当的 HTTP 状态码
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate SQL';
      // 如果是业务逻辑错误（如表不存在、信息不足），返回 400
      // 如果是系统错误，返回 500
      const statusCode =
        errorMessage.includes('No tables found') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('不存在') ||
        errorMessage.includes('不足')
          ? 400
          : 500;
      return response.status(statusCode).send({
        message: errorMessage,
      });
    }
  }
}
