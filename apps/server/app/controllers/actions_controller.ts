import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { ActionExecutor } from '@sparkset/core';
import { ActionService } from '../services/action_service';
import { AIProviderService } from '../services/ai_provider_service';
import { AuthorizationService } from '../services/authorization_service.js';
import { SchemaService } from '../services/schema_service';
import { actionCreateSchema, actionUpdateSchema } from '../validators/action';
import type { Action } from '../models/types.js';
import type { AuthorizationAction, AuthorizationUser } from '../types/authorization.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import { toId } from '../utils/validation.js';

@inject()
export default class ActionsController {
  constructor(
    private service: ActionService,
    private actionExecutor?: ActionExecutor,
    private schemaService?: SchemaService,
    private aiProviderService?: AIProviderService,
    private authorization?: AuthorizationService,
  ) {}

  private unauthorized(response: HttpContext['response']) {
    return response.unauthorized({ message: 'Not authenticated' });
  }

  private forbidden(response: HttpContext['response'], action: AuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  private isSqlAction(type: unknown): boolean {
    return String(type).toLowerCase() === 'sql';
  }

  private datasourceIdFromPayload(payload: unknown): number | null {
    if (!payload || typeof payload !== 'object') return null;
    const datasourceId = (payload as { datasourceId?: unknown }).datasourceId;
    return toId(datasourceId);
  }

  private datasourceIdForAction(action: Pick<Action, 'type' | 'payload'>): number | null {
    if (!this.isSqlAction(action.type)) return null;
    return this.datasourceIdFromPayload(action.payload);
  }

  private badSqlActionBinding(response: HttpContext['response']) {
    return response.badRequest({ message: 'SQL actions must include payload.datasourceId' });
  }

  private async canAccessDatasource(
    user: AuthorizationUser,
    datasourceId: number,
    action: AuthorizationAction,
  ): Promise<boolean> {
    if (!this.authorization) return false;
    return this.authorization.can(user, action, { type: 'datasource', id: datasourceId });
  }

  private async canAccessAction(
    user: AuthorizationUser,
    action: Pick<Action, 'type' | 'payload'>,
    permission: AuthorizationAction,
  ): Promise<boolean> {
    const datasourceId = this.datasourceIdForAction(action);
    if (!this.isSqlAction(action.type)) return true;
    if (!datasourceId) return false;
    return this.canAccessDatasource(user, datasourceId, permission);
  }

  async index(ctx: HttpContext) {
    const { response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const items = await this.service.list();
    const authorizedItems = [];
    for (const item of items) {
      if (await this.canAccessAction(user, item, 'datasource:view')) {
        authorizedItems.push(item);
      }
    }
    return response.ok({ items: authorizedItems });
  }

  async show(ctx: HttpContext) {
    const { params, response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid action ID' });
    const item = await this.service.get(id);
    if (!item) return response.notFound({ message: 'Action not found' });
    if (!(await this.canAccessAction(user, item, 'datasource:view'))) {
      return this.forbidden(response, 'datasource:view');
    }
    return response.ok(item);
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const parsed = actionCreateSchema.parse(request.body());
    const datasourceId = this.datasourceIdFromPayload(parsed.payload);
    if (this.isSqlAction(parsed.type)) {
      if (!datasourceId) return this.badSqlActionBinding(response);
      if (!(await this.canAccessDatasource(user, datasourceId, 'datasource:manage'))) {
        return this.forbidden(response, 'datasource:manage');
      }
    }

    const item = await this.service.create({
      ...parsed,
      description: parsed.description ?? undefined,
    });
    return response.created(item);
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const parsed = actionUpdateSchema.parse({ ...request.body(), ...params });
    const existing = await this.service.get(parsed.id);
    if (!existing) return response.notFound({ message: 'Action not found' });
    if (!(await this.canAccessAction(user, existing, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }

    const nextType = parsed.type ?? existing.type;
    const nextPayload = parsed.payload ?? existing.payload;
    const nextDatasourceId = this.datasourceIdFromPayload(nextPayload);
    if (this.isSqlAction(nextType)) {
      if (!nextDatasourceId) return this.badSqlActionBinding(response);
      if (!(await this.canAccessDatasource(user, nextDatasourceId, 'datasource:manage'))) {
        return this.forbidden(response, 'datasource:manage');
      }
    }

    const item = await this.service.update({
      ...parsed,
      description: parsed.description ?? undefined,
    });
    return response.ok(item);
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid action ID' });
    const item = await this.service.get(id);
    if (!item) return response.notFound({ message: 'Action not found' });
    if (!(await this.canAccessAction(user, item, 'datasource:manage'))) {
      return this.forbidden(response, 'datasource:manage');
    }
    await this.service.remove(id);
    return response.noContent();
  }

  async execute(ctx: HttpContext) {
    const { params, request, response } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

    const id = toId(params.id);
    if (!id) return response.badRequest({ message: 'Invalid action ID' });
    const item = await this.service.get(id);
    if (!item) return response.notFound({ message: 'Action not found' });
    const datasourceId = this.datasourceIdForAction(item);
    if (this.isSqlAction(item.type)) {
      if (!datasourceId) return this.badSqlActionBinding(response);
      if (!(await this.canAccessDatasource(user, datasourceId, 'datasource:manage'))) {
        return this.forbidden(response, 'datasource:manage');
      }
    }
    if (!this.actionExecutor) {
      return response.serviceUnavailable({
        message: 'Action executor is not available on this server',
      });
    }

    // 从请求体中获取 parameters，如果没有则使用 Action 中存储的 parameters
    const requestParameters = (request.body() as { parameters?: unknown })?.parameters;
    const parameters = requestParameters !== undefined ? requestParameters : item.parameters;

    try {
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
    } catch (error) {
      return response
        .status(500)
        .send({ message: error instanceof Error ? error.message : 'Execution failed' });
    }
  }

  async generateSQL(ctx: HttpContext) {
    const { request, response, logger } = ctx;
    const user = getAuthenticatedUser(ctx);
    if (!user) return this.unauthorized(response);

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
    const datasourceId = toId(body.datasourceId);
    if (!datasourceId) {
      return response.status(400).send({ message: 'Invalid datasource ID' });
    }
    if (!(await this.canAccessDatasource(user, datasourceId, 'datasource:query'))) {
      return this.forbidden(response, 'datasource:query');
    }

    try {
      // 获取数据源 Schema
      const schemas = await this.schemaService.list(datasourceId);
      if (schemas.length === 0) {
        return response.status(400).send({
          message: `No tables found in datasource ${datasourceId}. Please sync the datasource schema first.`,
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
        datasourceId,
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
