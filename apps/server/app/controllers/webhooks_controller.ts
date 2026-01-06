import type { HttpContext } from '@adonisjs/core/http';
import { botAdapterRegistry } from '../adapters/bot_adapter_registry.js';
import Bot from '../models/bot.js';
import BotEvent from '../models/bot_event.js';
import { toId } from '../utils/validation.js';

/**
 * Webhook Controller for handling incoming Bot messages from external platforms
 */
export default class WebhooksController {
  /**
   * Handle webhook request from external platform (WeChat Work, Discord, etc.)
   * POST /webhooks/bot/:botId/:token
   */
  async handleBotWebhook({ params, request, response }: HttpContext) {
    const startTime = Date.now();

    try {
      const botId = toId(params.botId);
      const token = params.token;

      // Validate parameters
      if (!botId || !token) {
        return response.badRequest({
          success: false,
          message: 'Invalid bot ID or token',
        });
      }

      // 1. Get bot from database
      const bot = await Bot.find(botId);
      if (!bot) {
        return response.notFound({
          success: false,
          message: `Bot with ID ${botId} not found`,
        });
      }

      // 2. Verify webhook token
      if (bot.webhookToken !== token) {
        return response.unauthorized({
          success: false,
          message: 'Invalid webhook token',
        });
      }

      // 3. Get the adapter for this bot's type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let adapter: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        adapter = await botAdapterRegistry.create(bot.type as any, bot.adapterConfig);
      } catch (error) {
        console.error(`Failed to create adapter for bot type '${bot.type}':`, error);
        return response.internalServerError({
          success: false,
          message: `Unsupported bot type: ${bot.type}`,
        });
      }

      // 4. Get the raw request payload
      const payload = request.all();

      // 5. Handle platform-specific challenge (if applicable)
      // Some platforms (like WeChat Work) require a challenge response for verification
      const challenge = adapter.handleChallenge?.(payload);
      if (challenge) {
        // Bot has been successfully verified
        if (!bot.isVerified) {
          await bot.merge({ isVerified: true }).save();
        }
        return response.ok({ challenge });
      }

      // 6. Verify webhook signature
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
          console.warn(`Invalid signature for bot ${botId}`);
          return response.unauthorized({
            success: false,
            message: 'Invalid webhook signature',
          });
        }
      }

      // 7. Parse message to unified format
      const parsedMessage = adapter.parseMessage(payload);
      if (!parsedMessage) {
        // Not a message we care about, just return success
        return response.ok({ success: true });
      }

      // 8. Create BotEvent record
      const botEvent = await BotEvent.create({
        botId,
        externalEventId: parsedMessage.messageId || `${parsedMessage.externalUserId}_${Date.now()}`,
        content: parsedMessage.text,
        externalUserId: parsedMessage.externalUserId,
        externalUserName: parsedMessage.externalUserName || null,
        internalUserId: null, // Will be set later if user is found
        status: 'pending',
        retryCount: 0,
        maxRetries: bot.maxRetries,
      });

      // Return 200 immediately (async processing)
      response.accepted({ success: true, eventId: botEvent.id });

      // 9. Process asynchronously (fire and forget)
      // In production, this should be queued to a job processor
      setImmediate(() => {
        this.processBotEvent(botId, botEvent.id, bot, adapter, parsedMessage, startTime).catch(
          (error) => {
            console.error(`Failed to process bot event ${botEvent.id}:`, error);
          },
        );
      });
    } catch (error) {
      console.error('Webhook handler error:', error);
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * Process bot event asynchronously
   * This handles: intent detection, action/query execution, response sending
   */
  private async processBotEvent(
    _botId: number,
    eventId: number,
    _bot: Bot,
    adapter: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    parsedMessage: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    startTime: number,
  ): Promise<void> {
    try {
      // Update event status to processing
      const event = await BotEvent.find(eventId);
      if (!event) return;

      await event.merge({ status: 'processing' }).save();

      // TODO: Phase 2.3 - Intent detection and dispatch logic
      // This will be implemented in the next step
      // For now, just send a simple response

      const processingTimeMs = Date.now() - startTime;

      await event
        .merge({
          status: 'completed',
          processingTimeMs,
        })
        .save();

      // Send reply back to user
      await adapter.sendReply(
        parsedMessage.externalUserId,
        'Bot message received and processing started.',
      );
    } catch (error) {
      console.error(`Error processing bot event ${eventId}:`, error);

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

        try {
          await adapter.sendError(parsedMessage.externalUserId, errorMessage);
        } catch (sendError) {
          console.error(`Failed to send error message:`, sendError);
        }
      }
    }
  }
}
