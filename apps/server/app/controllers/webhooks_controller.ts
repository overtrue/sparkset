/**
 * Webhooks Controller
 * 接入层 - 处理来自各个平台的 Webhook 消息
 * 职责：验证、解析、用户映射、核心处理、响应发送、日志记录
 *
 * Phase 2.6: 集成完整的 BotProcessor 处理流程
 */

import type { HttpContext } from '@adonisjs/core/http';
import app from '@adonisjs/core/services/app';
import { botAdapterRegistry } from '../adapters/bot_adapter_registry.js';
import { BotProcessor, type BotProcessInput } from '../services/bot_processor.js';
import Bot from '../models/bot.js';
import BotEvent from '../models/bot_event.js';
import { toId } from '../utils/validation.js';

export default class WebhooksController {
  /**
   * 获取 BotProcessor 实例
   * 从 IoC 容器获取，失败时直接抛错
   */
  private async getBotProcessor(): Promise<BotProcessor> {
    return app.container.make(BotProcessor);
  }

  /**
   * 处理来自外部平台的 Webhook 消息
   * POST /webhooks/bot/:botId/:token
   *
   * 流程：
   * 1. 验证 bot 和 token
   * 2. 创建适配器并验证签名
   * 3. 处理平台特定的 challenge（如企业微信验证）
   * 4. 解析消息为统一格式
   * 5. 映射外部用户 ID 到内部用户 ID
   * 6. 创建 BotEvent 记录
   * 7. 异步处理消息（核心业务逻辑）
   */
  async handleBotWebhook({ params, request, response }: HttpContext) {
    const startTime = Date.now();

    try {
      // ============ 第一步：验证 Bot 和 Token ============
      const botId = toId(params.botId);
      const token = params.token;

      if (!botId || !token) {
        return response.badRequest({
          success: false,
          message: 'Invalid bot ID or token',
        });
      }

      const bot = await Bot.find(botId);
      if (!bot) {
        return response.notFound({
          success: false,
          message: `Bot with ID ${botId} not found`,
        });
      }

      if (bot.webhookToken !== token) {
        return response.unauthorized({
          success: false,
          message: 'Invalid webhook token',
        });
      }

      // ============ 第二步：创建适配器 ============
      let adapter: any; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        adapter = await botAdapterRegistry.create(bot.type as any, bot.adapterConfig); // eslint-disable-line @typescript-eslint/no-explicit-any
      } catch (error) {
        console.error(`[Webhook] Failed to create adapter for bot type '${bot.type}':`, error);
        return response.internalServerError({
          success: false,
          message: `Unsupported bot type: ${bot.type}`,
        });
      }

      // ============ 第三步：获取原始请求负载 ============
      const payload = request.all();

      // ============ 第四步：处理 Challenge（某些平台需要） ============
      const challenge = adapter.handleChallenge?.(payload);
      if (challenge) {
        // 平台验证成功，标记 bot 为已验证
        if (!bot.isVerified) {
          await bot.merge({ isVerified: true }).save();
        }
        return response.ok({ challenge });
      }

      // ============ 第五步：验证 Webhook 签名 ============
      const signature =
        request.header('X-WeChat-Signature') ||
        request.header('X-Signature') ||
        request.header('Signature') ||
        null;

      const timestamp =
        request.header('X-WeChat-Timestamp') ||
        request.header('X-Timestamp') ||
        request.header('Timestamp') ||
        null;

      if (signature && timestamp) {
        const isValid = adapter.verifySignature(payload, signature, timestamp);
        if (!isValid) {
          console.warn(`[Webhook] Invalid signature for bot ${botId}`);
          return response.unauthorized({
            success: false,
            message: 'Invalid webhook signature',
          });
        }
      }

      // ============ 第六步：解析消息为统一格式 ============
      const parsedMessage = adapter.parseMessage(payload);
      if (!parsedMessage) {
        // 不是我们关心的消息，直接返回成功
        return response.ok({ success: true });
      }

      // ============ 第七步：映射外部用户 ID 到内部用户 ID ============
      let internalUserId: number | null = null;
      if (adapter.resolveUserId) {
        try {
          internalUserId = await adapter.resolveUserId(
            parsedMessage.externalUserId,
            bot.adapterConfig,
          );
        } catch (error) {
          console.warn(
            `[Webhook] Failed to resolve user ID for external user ${parsedMessage.externalUserId}:`,
            error,
          );
          // 继续处理，但 internalUserId 为 null
        }
      }

      // ============ 第八步：创建 BotEvent 记录 ============
      const botEvent = await BotEvent.create({
        botId,
        externalEventId: parsedMessage.messageId || `${parsedMessage.externalUserId}_${Date.now()}`,
        content: parsedMessage.text,
        externalUserId: parsedMessage.externalUserId,
        externalUserName: parsedMessage.externalUserName || null,
        internalUserId,
        status: 'pending',
        retryCount: 0,
        maxRetries: bot.maxRetries,
      });

      // 如果成功映射了用户ID，立即更新事件记录
      if (internalUserId && internalUserId !== botEvent.internalUserId) {
        await botEvent.merge({ internalUserId }).save();
      }

      // 立即返回 202 Accepted（异步处理）
      response.accepted({ success: true, eventId: botEvent.id });

      // ============ 第九步：异步处理消息 ============
      setImmediate(() => {
        this.processBotMessage(
          botId,
          botEvent.id,
          bot,
          adapter,
          parsedMessage,
          internalUserId,
          startTime,
        ).catch((error) => {
          console.error(`[Webhook] Failed to process bot event ${botEvent.id}:`, error);
        });
      });
    } catch (error) {
      console.error('[Webhook] Handler error:', error);
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * 异步处理消息
   * Phase 2.6: 使用完整的 BotProcessor
   *
   * 流程：
   * 1. 更新事件状态为 processing
   * 2. 调用 bot 核心处理器
   * 3. 根据结果发送响应
   * 4. 更新事件状态为 completed 或 failed
   */
  private async processBotMessage(
    _botId: number,
    eventId: number,
    bot: Bot,
    adapter: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    parsedMessage: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    internalUserId: number | null,
    startTime: number,
  ): Promise<void> {
    try {
      // 获取事件记录
      const event = await BotEvent.find(eventId);
      if (!event) {
        console.warn(`[Webhook] Bot event ${eventId} not found`);
        return;
      }

      // 更新事件状态为 processing
      await event.merge({ status: 'processing' }).save();

      // ============ 调用 Bot 核心处理器 ============
      // 如果没有映射到内部用户，使用外部用户 ID 哈希作为临时用户 ID
      const userId =
        internalUserId || Math.abs(this.hashCode(parsedMessage.externalUserId) || 0) % 1000000;

      const input: BotProcessInput = {
        userId,
        text: parsedMessage.text,
        externalUserId: parsedMessage.externalUserId,
        externalUserName: parsedMessage.externalUserName,
      };

      // Phase 2.6: 使用完整的 BotProcessor（如果可用）
      const botProcessor = await this.getBotProcessor();

      // 使用完整的处理器（带会话追踪、意图识别等）
      const result = await botProcessor.process(bot, event, input);

      const processingTimeMs = Date.now() - startTime;

      if (result.success) {
        // ============ 处理成功：更新事件并发送响应 ============
        await event
          .merge({
            status: 'completed',
            actionResult: result.actionResult || null,
            processingTimeMs,
          })
          .save();

        // 发送回复
        try {
          await adapter.sendReply(parsedMessage.externalUserId, result.response);
        } catch (sendError) {
          console.error(`[Webhook] Failed to send reply:`, sendError);
        }
      } else {
        // ============ 处理失败：更新事件并发送错误 ============
        await event
          .merge({
            status: 'failed',
            errorMessage: result.error || 'Unknown error',
            processingTimeMs,
          })
          .save();

        // 发送错误消息
        try {
          await adapter.sendError(
            parsedMessage.externalUserId,
            result.error || 'Processing failed',
          );
        } catch (sendError) {
          console.error(`[Webhook] Failed to send error message:`, sendError);
        }
      }
    } catch (error) {
      console.error(`[Webhook] Error processing bot message:`, error);

      // 尝试更新事件为失败状态
      try {
        const event = await BotEvent.find(eventId);
        if (event) {
          const processingTimeMs = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          await event
            .merge({
              status: 'failed',
              errorMessage,
              processingTimeMs,
            })
            .save();
        }
      } catch (updateError) {
        console.error(`[Webhook] Failed to update event status:`, updateError);
      }
    }
  }

  /**
   * 简单的字符串哈希函数
   * 用于将外部用户 ID 转换为数字
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}
