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
        data: result.data,
        meta: {
          ...result.meta,
          current_page: result.meta.page,
          last_page: result.meta.lastPage,
          from: (result.meta.page - 1) * result.meta.perPage + 1,
          to: Math.min(result.meta.page * result.meta.perPage, result.meta.total),
        },
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
  async store({ request, response }: HttpContext & AuthContext) {
    try {
      // 验证请求数据
      const payload = createBotValidator.parse(request.body());

      // 获取当前用户 ID
      const user = (response as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      // 创建 Bot
      const bot = await botService.createBot(payload, user.id);

      return response.created({
        data: bot.serialize(),
      });
    } catch (error) {
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

      return response.ok({
        data: bot.serialize(),
      });
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
  async update({ params, request, response }: HttpContext & AuthContext) {
    try {
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 验证请求数据
      const payload = updateBotValidator.parse(request.body());

      // 获取当前用户 ID
      const user = (response as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      // 更新 Bot
      const bot = await botService.updateBot(id, payload, user.id);

      return response.ok({
        data: bot.serialize(),
      });
    } catch (error) {
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
  async destroy({ params, response }: HttpContext & AuthContext) {
    try {
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = (response as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      await botService.deleteBot(id, user.id);

      return response.noContent();
    } catch (error) {
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
  async regenerateToken({ params, response }: HttpContext & AuthContext) {
    try {
      const id = toId(params.id);
      if (!id) {
        return response.badRequest({ message: 'Invalid bot ID' });
      }

      // 获取当前用户 ID
      const user = (response as unknown as AuthContext).auth?.user;
      if (!user) {
        return response.unauthorized({ message: 'Not authenticated' });
      }

      const newToken = await botService.regenerateToken(id, user.id);

      // 返回新 Token 和完整的 Webhook URL
      const webhookUrl = await botService.getWebhookUrlForBot(id);

      return response.ok({
        data: {
          webhookToken: newToken,
          webhookUrl,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return response.notFound({ message: error.message });
      }
      return response.internalServerError({
        message: error instanceof Error ? error.message : 'Failed to regenerate token',
      });
    }
  }
}
