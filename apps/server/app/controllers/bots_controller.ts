import type { HttpContext } from '@adonisjs/core/http';
import { botService } from '../services/bot_service.js';
import { createBotValidator, updateBotValidator } from '../validators/bot.js';
import { toId } from '../utils/validation.js';

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
      const { message, platform } = request.body() as {
        message: string;
        platform?: string;
      };

      if (!message) {
        return response.badRequest({ message: 'Message is required' });
      }

      // 调用测试服务
      const result = await botService.testBot(id, message, platform);

      return response.ok(result);
    } catch (error) {
      const { response } = ctx;
      console.error('Bot test error:', error);
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to test bot',
      });
    }
  }
}
