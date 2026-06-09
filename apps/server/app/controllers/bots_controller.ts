import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import type { Action } from '../models/types.js';
import { ActionService } from '../services/action_service.js';
import { BotService } from '../services/bot_service.js';
import { DerivedResourceAuthorizationService } from '../services/derived_resource_authorization_service.js';
import { createBotValidator, updateBotValidator } from '../validators/bot.js';
import { toId } from '../utils/validation.js';
import BotEvent from '../models/bot_event.js';
import { getAuthenticatedUser } from '../utils/auth_context.js';
import type { AuthorizationAction, AuthorizationUser } from '../types/authorization.js';

/**
 * Bots RESTful API Controller
 */
@inject()
export default class BotsController {
  constructor(
    private service: BotService,
    private resourceAuthorization: DerivedResourceAuthorizationService,
    private actionService: ActionService,
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

  private datasourceIdForAction(action: Pick<Action, 'type' | 'payload'>): number | null {
    if (!this.isSqlAction(action.type)) return null;
    if (!action.payload || typeof action.payload !== 'object') return null;
    return toId((action.payload as { datasourceId?: unknown }).datasourceId);
  }

  private async canManageEnabledActions(
    user: AuthorizationUser,
    enabledActions?: number[] | null,
  ): Promise<boolean> {
    const actionIds = Array.from(
      new Set(
        (enabledActions ?? [])
          .map((actionId) => toId(actionId))
          .filter((actionId): actionId is number => actionId !== null),
      ),
    );

    for (const actionId of actionIds) {
      const action = await this.actionService.get(actionId);
      if (!action) return false;

      const datasourceId = this.datasourceIdForAction(action);
      if (this.isSqlAction(action.type) && !datasourceId) return false;
      if (
        datasourceId &&
        !(await this.resourceAuthorization.canAccessDatasource(
          user,
          datasourceId,
          'datasource:manage',
        ))
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取 Bot 列表
   * GET /api/bots
   */
  async index(ctx: HttpContext) {
    const { request, response } = ctx;
    try {
      const user = getAuthenticatedUser(ctx);
      if (!user) return this.unauthorized(response);

      const page = request.input('page', 1);
      const perPage = request.input('per_page', 10);

      const result = await this.service.listBots(page, perPage);
      const authorizedItems = [];
      for (const bot of result.data) {
        if (await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:view')) {
          authorizedItems.push(bot);
        }
      }

      return response.ok({
        items: authorizedItems,
      });
    } catch (error) {
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to list bots',
      });
    }
  }

  /**
   * 创建新 Bot
   * POST /api/bots
   */
  async store(ctx: HttpContext) {
    try {
      const { request, response } = ctx;
      // 验证请求数据
      const payload = createBotValidator.parse(request.body());

      // 获取当前用户 ID
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return this.unauthorized(response);
      }

      const datasourceConfig = {
        enabledDataSources: payload.enabledDataSources,
        defaultDataSourceId: payload.defaultDataSourceId,
      };
      if (
        !(await this.resourceAuthorization.canAccessBotConfig(
          user,
          datasourceConfig,
          'datasource:query',
        ))
      ) {
        return this.forbidden(response, 'datasource:query');
      }
      if (!(await this.canManageEnabledActions(user, payload.enabledActions))) {
        return this.forbidden(response, 'datasource:manage');
      }

      // 创建 Bot
      const bot = await this.service.createBot(payload, user.id);

      return response.created(bot.serialize());
    } catch (error) {
      const { response } = ctx;
      if (error instanceof Error && error.message.includes('validation')) {
        return response.badRequest({
          message: 'Validation failed',
          errors: error,
        });
      }
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to create bot',
      });
    }
  }

  /**
   * 获取 Bot 详情
   * GET /api/bots/:id
   */
  async show(ctx: HttpContext) {
    const { params, response } = ctx;
    try {
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      const bot = await this.service.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }

      const user = getAuthenticatedUser(ctx);
      if (!user) return this.unauthorized(response);
      if (!(await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:view'))) {
        return this.forbidden(response, 'datasource:view');
      }

      return response.ok(bot.serialize());
    } catch (error) {
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to fetch bot',
      });
    }
  }

  /**
   * 更新 Bot
   * PUT /api/bots/:id
   */
  async update(ctx: HttpContext) {
    try {
      const { params, request, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 验证请求数据
      const payload = updateBotValidator.parse(request.body());

      // 获取当前用户 ID
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return this.unauthorized(response);
      }

      const existing = await this.service.getBot(id);
      if (!existing) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }
      if (!(await this.resourceAuthorization.canAccessBot(user, existing, 'datasource:manage'))) {
        return this.forbidden(response, 'datasource:manage');
      }
      const datasourceConfig = {
        enabledDataSources: payload.enabledDataSources ?? existing.enabledDataSources,
        defaultDataSourceId: payload.defaultDataSourceId ?? existing.defaultDataSourceId,
      };
      if (
        !(await this.resourceAuthorization.canAccessBotConfig(
          user,
          datasourceConfig,
          'datasource:query',
        ))
      ) {
        return this.forbidden(response, 'datasource:query');
      }
      if (
        !(await this.canManageEnabledActions(
          user,
          payload.enabledActions ?? existing.enabledActions,
        ))
      ) {
        return this.forbidden(response, 'datasource:manage');
      }

      // 更新 Bot
      const bot = await this.service.updateBot(id, payload, user.id);

      return response.ok(bot.serialize());
    } catch (error) {
      const { response } = ctx;
      if (error instanceof Error && error.message.includes('not found')) {
        return response.notFound({ message: error.message });
      }
      if (error instanceof Error && error.message.includes('validation')) {
        return response.badRequest({
          message: 'Validation failed',
          errors: error,
        });
      }
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to update bot',
      });
    }
  }

  /**
   * 删除 Bot
   * DELETE /api/bots/:id
   */
  async destroy(ctx: HttpContext) {
    try {
      const { params, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return this.unauthorized(response);
      }

      const bot = await this.service.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }
      if (!(await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:manage'))) {
        return this.forbidden(response, 'datasource:manage');
      }

      await this.service.deleteBot(id, user.id);

      return response.noContent();
    } catch (error) {
      const { response } = ctx;
      if (error instanceof Error && error.message.includes('not found')) {
        return response.notFound({ message: error.message });
      }
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to delete bot',
      });
    }
  }

  /**
   * 重新生成 Webhook Token
   * POST /api/bots/:id/regenerate-token
   */
  async regenerateToken(ctx: HttpContext) {
    try {
      const { params, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return this.unauthorized(response);
      }

      const bot = await this.service.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }
      if (!(await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:manage'))) {
        return this.forbidden(response, 'datasource:manage');
      }

      const newToken = await this.service.regenerateToken(id, user.id);

      // 返回新 Token 和完整的 Webhook URL
      const webhookUrl = await this.service.getWebhookUrlForBot(id);

      return response.ok({
        webhookToken: newToken,
        webhookUrl,
      });
    } catch (error) {
      const { response } = ctx;
      if (error instanceof Error && error.message.includes('not found')) {
        return response.notFound({ message: error.message });
      }
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to regenerate token',
      });
    }
  }

  /**
   * 测试 Bot 消息处理
   * POST /api/bots/:id/test
   * 用于测试 bot 对特定消息的响应
   */
  async test(ctx: HttpContext) {
    try {
      const { params, request, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return this.unauthorized(response);
      }

      // 获取 bot
      const bot = await this.service.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }
      if (!(await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:query'))) {
        return this.forbidden(response, 'datasource:query');
      }

      // 获取请求体中的测试消息
      const { message } = request.body() as {
        message: string;
      };

      if (!message) {
        return response.badRequest({ message: 'Message is required' });
      }

      // 调用测试服务
      const result = await this.service.testBot(id, message);

      return response.ok(result);
    } catch (error) {
      const { response } = ctx;
      console.error('Bot test error:', error);
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to test bot',
      });
    }
  }

  /**
   * 获取 Bot 事件列表
   * GET /api/bots/:id/events
   * 用于获取 bot 处理的事件列表
   */
  async events(ctx: HttpContext) {
    try {
      const { params, request, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 验证 bot 存在
      const bot = await this.service.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }
      const user = getAuthenticatedUser(ctx);
      if (!user) return this.unauthorized(response);
      if (!(await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:query'))) {
        return this.forbidden(response, 'datasource:query');
      }

      // 获取分页参数
      const page = request.input('page', 1);
      const limit = request.input('limit', 20);
      const status = request.input('status');
      const fromDate = request.input('from_date');

      // 构建查询
      let query = BotEvent.query().where('bot_id', id);

      // 应用状态过滤
      if (status) {
        query = query.where('status', status);
      }

      // 应用日期过滤
      if (fromDate) {
        query = query.where('created_at', '>=', fromDate);
      }

      // 按创建时间排序（最新的在前）
      query = query.orderBy('created_at', 'desc');

      // 获取分页结果
      const events = await query.paginate(page, limit);

      return response.ok({
        items: events.all(),
        pagination: {
          total: events.total,
          perPage: events.perPage,
          currentPage: events.currentPage,
          lastPage: events.lastPage,
        },
      });
    } catch (error) {
      const { response } = ctx;
      console.error('Bot events error:', error);
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to fetch bot events',
      });
    }
  }

  /**
   * 重放 Bot 事件
   * POST /api/bots/:botId/events/:eventId/replay
   * 用于重新处理之前的事件
   */
  async replayEvent(ctx: HttpContext) {
    try {
      const { params, response } = ctx;
      const botId = toId(params.botId);
      const eventId = toId(params.eventId);

      if (!botId || !eventId) {
        return response.badRequest({ message: 'Invalid bot or event ID' });
      }

      // 验证 bot 存在
      const bot = await this.service.getBot(botId);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${botId} not found` });
      }
      const user = getAuthenticatedUser(ctx);
      if (!user) return this.unauthorized(response);
      if (!(await this.resourceAuthorization.canAccessBot(user, bot, 'datasource:query'))) {
        return this.forbidden(response, 'datasource:query');
      }

      // 获取原始事件
      const event = await BotEvent.findOrFail(eventId);

      if (event.botId !== botId) {
        return response.badRequest({ message: 'Event does not belong to this bot' });
      }

      // 重放事件 - 重新处理该消息
      const result = await this.service.testBot(botId, event.content);

      return response.ok({
        success: result.success,
        message: result.success ? 'Event replayed successfully' : 'Event replay failed',
        originalEventId: event.id,
        originalContent: event.content,
        response: result.response,
        error: result.error,
        processingTimeMs: result.processingTimeMs,
      });
    } catch (error) {
      const { response } = ctx;
      console.error('Bot event replay error:', error);
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to replay bot event',
      });
    }
  }
}
