import { ActionExecutor } from '@sparkset/core';
import { FastifyReply } from 'fastify';
import { ActionService } from '../../services/actionService';
import { AIProviderService } from '../../services/aiProviderService';
import { SchemaService } from '../../services/schemaService';
import { actionCreateSchema, actionUpdateSchema } from '../../validators/action';
import { TypedRequest } from '../types';

export class ActionsController {
  constructor(
    private service: ActionService,
    private actionExecutor?: ActionExecutor,
    private schemaService?: SchemaService,
    private aiProviderService?: AIProviderService,
  ) {}

  async index(_req: TypedRequest, reply: FastifyReply) {
    const items = await this.service.list();
    return reply.send({ items });
  }

  async show(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const item = await this.service.get(id);
    if (!item) return reply.code(404).send({ message: 'Action not found' });
    return reply.send(item);
  }

  async store(req: TypedRequest, reply: FastifyReply) {
    const parsed = actionCreateSchema.parse(req.body);
    const item = await this.service.create(parsed);
    return reply.code(201).send(item);
  }

  async update(req: TypedRequest, reply: FastifyReply) {
    const parsed = actionUpdateSchema.parse({ ...req.body, ...req.params });
    const item = await this.service.update(parsed);
    return reply.send(item);
  }

  async destroy(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    await this.service.remove(id);
    return reply.code(204).send();
  }

  async execute(req: TypedRequest, reply: FastifyReply) {
    const id = Number((req.params as { id: string }).id);
    const item = await this.service.get(id);
    if (!item) return reply.code(404).send({ message: 'Action not found' });
    if (!this.actionExecutor)
      return reply.send({ message: 'Action executed (stub)', action: item });

    // 从请求体中获取 parameters，如果没有则使用 Action 中存储的 parameters
    const requestParameters = (req.body as { parameters?: unknown })?.parameters;
    const parameters = requestParameters !== undefined ? requestParameters : item.parameters;

    const result = await this.actionExecutor.run({
      id: item.id,
      type: item.type,
      payload: item.payload,
      parameters,
    });
    if (!result.success) {
      return reply.code(400).send({ message: result.error?.message ?? 'Execution failed' });
    }
    return reply.send({ actionId: item.id, result: result.data });
  }

  async generateSQL(req: TypedRequest, reply: FastifyReply) {
    if (!this.schemaService) {
      return reply.code(500).send({ message: 'Schema service not available' });
    }
    if (!this.aiProviderService) {
      return reply.code(500).send({ message: 'AI provider service not available' });
    }

    const body = req.body as {
      name: string;
      description?: string;
      datasourceId: number;
      aiProviderId?: number;
    };

    if (!body.name || !body.datasourceId) {
      return reply.code(400).send({
        message: 'Missing required fields: name, datasourceId',
      });
    }

    try {
      // 获取数据源 Schema
      const schemas = await this.schemaService.list(body.datasourceId);
      if (schemas.length === 0) {
        return reply.code(400).send({
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
        return reply.code(400).send({
          message: 'No AI provider available. Please configure an AI provider first.',
        });
      }

      // 生成 SQL
      const result = await this.service.generateSQL(
        body.name,
        body.description || '',
        body.datasourceId,
        {
          schemas,
          aiProvider,
          logger: req.log,
        },
      );

      return reply.send(result);
    } catch (error) {
      req.log.error(
        error instanceof Error ? error : new Error(String(error)),
        'Generate SQL error',
      );
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
      return reply.code(statusCode).send({
        message: errorMessage,
      });
    }
  }
}
