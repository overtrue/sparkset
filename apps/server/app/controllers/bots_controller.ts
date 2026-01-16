import type { HttpContext } from '@adonisjs/core/http';
import { botService } from '../services/bot_service.js';
import { createBotValidator, updateBotValidator } from '../validators/bot.js';
import { toId } from '../utils/validation.js';
import BotEvent from '../models/bot_event.js';

interface AuthContext {
  auth?: {
    user?: { id: number };
  };
}

/**
 * Bots RESTful API Controller
 */
export default class BotsController {
  /**
   * 获取 Bot 列表
   * GET /api/bots
   */
  async index({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1);
      const perPage = request.input('per_page', 10);

      const result = await botService.listBots(page, perPage);

      return response.ok({
        items: result.data,
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
  async store(ctx: HttpContext & AuthContext) {
    try {
      const { request, response } = ctx;
      // 验证请求数据
      const payload = createBotValidator.parse(request.body());

      // 获取当前用户 ID
      const user = (ctx as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      // 创建 Bot
      const bot = await botService.createBot(payload, user.id);

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
  async show({ params, response }: HttpContext) {
    try {
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      const bot = await botService.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
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
  async update(ctx: HttpContext & AuthContext) {
    try {
      const { params, request, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 验证请求数据
      const payload = updateBotValidator.parse(request.body());

      // 获取当前用户 ID
      const user = (ctx as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      // 更新 Bot
      const bot = await botService.updateBot(id, payload, user.id);

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
  async destroy(ctx: HttpContext & AuthContext) {
    try {
      const { params, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = (ctx as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      await botService.deleteBot(id, user.id);

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
  async regenerateToken(ctx: HttpContext & AuthContext) {
    try {
      const { params, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = (ctx as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      const newToken = await botService.regenerateToken(id, user.id);

      // 返回新 Token 和完整的 Webhook URL
      const webhookUrl = await botService.getWebhookUrlForBot(id);

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
  async test(ctx: HttpContext & AuthContext) {
    try {
      const { params, request, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = (ctx as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      // 获取 bot
      const bot = await botService.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
      }

      // 获取请求体中的测试消息
      const { message } = request.body() as {
        message: string;
      };

      if (!message) {
        return response.badRequest({ message: 'Message is required' });
      }

      // 调用测试服务
      const result = await botService.testBot(id, message);

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
  async events(ctx: HttpContext & AuthContext) {
    try {
      const { params, request, response } = ctx;
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 验证 bot 存在
      const bot = await botService.getBot(id);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${id} not found` });
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
  async replayEvent(ctx: HttpContext & AuthContext) {
    try {
      const { params, response } = ctx;
      const botId = toId(params.botId);
      const eventId = toId(params.eventId);

      if (!botId || !eventId) {
        return response.badRequest({ message: 'Invalid bot or event ID' });
      }

      // 验证 bot 存在
      const bot = await botService.getBot(botId);
      if (!bot) {
        return response.notFound({ message: `Bot with ID ${botId} not found` });
      }

      // 获取原始事件
      const event = await BotEvent.findOrFail(eventId);

      if (event.botId !== botId) {
        return response.badRequest({ message: 'Event does not belong to this bot' });
      }

      // 重放事件 - 重新处理该消息
      const result = await botService.testBot(botId, event.content);

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
