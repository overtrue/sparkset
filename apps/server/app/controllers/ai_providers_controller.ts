import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import { AIProviderService } from '../services/ai_provider_service.js';
import { AuthorizationService } from '../services/authorization_service.js';
import {
  aiProviderCreateSchema,
  aiProviderUpdateSchema,
  setDefaultSchema,
} from '../validators/aiProvider.js';
import { toId } from '../utils/validation.js';
import { serializeAIProvider, serializeAIProviders } from '../utils/serializers.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { GlobalAuthorizationAction } from '../types/authorization.js';

type AIProviderCapabilityAction = Extract<
  GlobalAuthorizationAction,
  'ai_provider:view' | 'ai_provider:manage' | 'ai_provider:manage_credentials'
>;

@inject()
export default class AIProvidersController {
  constructor(
    private service: AIProviderService,
    private authorization: AuthorizationService,
  ) {}

  private getUser(ctx: HttpContext) {
    return getAuthenticatedUser(ctx);
  }

  private unauthorized(response: HttpContext['response']) {
    return response.unauthorized({
      error: 'Authentication required',
      message: '请提供有效的访问令牌',
    });
  }

  private forbidden(response: HttpContext['response'], action: GlobalAuthorizationAction) {
    return response.forbidden({
      error: 'Forbidden',
      message: `Missing permission: ${action}`,
    });
  }

  private canPerform(ctx: HttpContext, action: GlobalAuthorizationAction): boolean {
    return this.authorization.canPerformGlobalAction(this.getUser(ctx), action);
  }

  private aiProviderCapabilities(ctx: HttpContext) {
    const capability = (action: AIProviderCapabilityAction) => this.canPerform(ctx, action);
    return {
      canView: capability('ai_provider:view'),
      canManage: capability('ai_provider:manage'),
      canManageCredentials: capability('ai_provider:manage_credentials'),
    };
  }

  private hasConnectionSettingChanges(input: Record<string, unknown>): boolean {
    return ['type', 'apiKey', 'baseURL', 'defaultModel'].some((field) =>
      Object.prototype.hasOwnProperty.call(input, field),
    );
  }

  async index(ctx: HttpContext) {
    const { response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    if (!this.canPerform(ctx, 'ai_provider:view')) {
      return this.forbidden(response, 'ai_provider:view');
    }
    const items = await this.service.list();
    return response.ok({
      items: serializeAIProviders(items),
      capabilities: this.aiProviderCapabilities(ctx),
    });
  }

  async store(ctx: HttpContext) {
    const { request, response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    if (!this.canPerform(ctx, 'ai_provider:manage_credentials')) {
      return this.forbidden(response, 'ai_provider:manage_credentials');
    }
    const parsed = aiProviderCreateSchema.parse(request.body());
    const record = await this.service.create(parsed);
    return response.created(serializeAIProvider(record));
  }

  async update(ctx: HttpContext) {
    const { params, request, response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    const body = request.body() as Record<string, unknown>;
    if (!this.canPerform(ctx, 'ai_provider:manage')) {
      return this.forbidden(response, 'ai_provider:manage');
    }
    if (
      this.hasConnectionSettingChanges(body) &&
      !this.canPerform(ctx, 'ai_provider:manage_credentials')
    ) {
      return this.forbidden(response, 'ai_provider:manage_credentials');
    }
    const parsed = aiProviderUpdateSchema.parse({ ...body, ...params });
    const record = await this.service.update(parsed);
    return response.ok(serializeAIProvider(record));
  }

  async destroy(ctx: HttpContext) {
    const { params, response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    if (!this.canPerform(ctx, 'ai_provider:manage')) {
      return this.forbidden(response, 'ai_provider:manage');
    }
    const id = toId(params.id);
    if (!id) {
      return response.badRequest({ message: 'Invalid provider ID' });
    }
    await this.service.remove(id);
    return response.noContent();
  }

  async setDefault(ctx: HttpContext) {
    const { params, response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    if (!this.canPerform(ctx, 'ai_provider:manage')) {
      return this.forbidden(response, 'ai_provider:manage');
    }
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
  async testConnection(ctx: HttpContext) {
    const { params, response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    if (!this.canPerform(ctx, 'ai_provider:manage_credentials')) {
      return this.forbidden(response, 'ai_provider:manage_credentials');
    }
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
  async testConnectionByConfig(ctx: HttpContext) {
    const { request, response } = ctx;
    if (!this.getUser(ctx)) return this.unauthorized(response);
    if (!this.canPerform(ctx, 'ai_provider:manage_credentials')) {
      return this.forbidden(response, 'ai_provider:manage_credentials');
    }
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
