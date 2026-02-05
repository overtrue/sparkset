import { randomBytes } from 'crypto';
import Bot from '../models/bot.js';
import BotLog from '../models/bot_log.js';
import type { CreateBotRequest, UpdateBotRequest } from '../types/bot.js';

/**
 * Field configuration for update operations
 * Defines how each field should be compared and processed
 */
interface UpdateFieldConfig {
  /** Field name in both data and bot objects */
  name: keyof UpdateBotRequest & keyof Bot;
  /** Comparison function - returns true if values are different */
  isDifferent: (dataValue: unknown, botValue: unknown) => boolean;
  /** Optional transformer for complex comparisons */
  compareValue?: (value: unknown) => string;
}

/**
 * Bot 业务逻辑服务
 * 处理 Bot 的创建、更新、删除、查询等操作
 * 不涉及消息处理逻辑（那是 BotProcessor 的职责）
 */
export class BotService {
  /**
   * 生成安全的 Webhook Token
   * 使用 64 字符十六进制字符串
   */
  private generateWebhookToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * 获取完整的 Webhook URL
   */
  private getWebhookUrl(botId: number, token: string): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3333';
    return `${baseUrl}/webhooks/bot/${botId}/${token}`;
  }

  /**
   * Field configuration for update operations
   * Defines comparison logic for each updatable field
   */
  private readonly updateFieldConfigs: UpdateFieldConfig[] = [
    // Simple primitive fields
    { name: 'name', isDifferent: (data, bot) => data !== bot },
    { name: 'description', isDifferent: (data, bot) => data !== bot },
    { name: 'defaultDataSourceId', isDifferent: (data, bot) => data !== bot },
    { name: 'aiProviderId', isDifferent: (data, bot) => data !== bot },
    { name: 'enableQuery', isDifferent: (data, bot) => data !== bot },
    { name: 'isActive', isDifferent: (data, bot) => data !== bot },
    { name: 'isVerified', isDifferent: (data, bot) => data !== bot },
    { name: 'rateLimit', isDifferent: (data, bot) => data !== bot },
    { name: 'maxRetries', isDifferent: (data, bot) => data !== bot },
    { name: 'requestTimeout', isDifferent: (data, bot) => data !== bot },
    // Complex fields requiring JSON comparison
    {
      name: 'adapterConfig',
      isDifferent: (data, bot) => JSON.stringify(data) !== JSON.stringify(bot),
    },
    {
      name: 'enabledActions',
      isDifferent: (data, bot) => JSON.stringify(data) !== JSON.stringify(bot),
    },
    {
      name: 'enabledDataSources',
      isDifferent: (data, bot) => JSON.stringify(data) !== JSON.stringify(bot),
    },
  ];

  /**
   * Process field updates using configuration
   * @param data - Update request data
   * @param bot - Current bot instance
   * @param changes - Object to collect changes
   * @param fieldsToUpdate - Object to collect fields for update
   */
  private processFieldUpdates(
    data: UpdateBotRequest,
    bot: Bot,
    changes: Record<string, { old: unknown; new: unknown }>,
    fieldsToUpdate: Record<string, unknown>,
  ): void {
    for (const config of this.updateFieldConfigs) {
      const dataValue = data[config.name];

      // Skip if field is not provided in update data
      if (dataValue === undefined) {
        continue;
      }

      const botValue = bot[config.name];

      // Check if values are different
      if (config.isDifferent(dataValue, botValue)) {
        changes[config.name] = { old: botValue, new: dataValue };
        fieldsToUpdate[config.name] = dataValue;
      }
    }
  }

  /**
   * 创建新 Bot
   */
  async createBot(data: CreateBotRequest, userId: number): Promise<Bot> {
    const webhookToken = this.generateWebhookToken();

    const bot = await Bot.create({
      name: data.name,
      description: data.description || null,
      type: data.type,
      webhookUrl: data.webhookUrl,
      webhookToken,
      adapterConfig: (data.adapterConfig as Record<string, unknown>) || null,
      enabledActions: data.enabledActions || [],
      enabledDataSources: data.enabledDataSources || [],
      defaultDataSourceId: data.defaultDataSourceId || null,
      aiProviderId: data.aiProviderId || null,
      enableQuery: data.enableQuery !== false, // 默认开启
      isActive: true,
      isVerified: false,
      rateLimit: data.rateLimit || null,
      maxRetries: data.maxRetries || 3,
      requestTimeout: data.requestTimeout || 30000,
      creatorId: userId,
    });

    // 更新 Webhook URL,包含实际的 Bot ID
    const actualWebhookUrl = this.getWebhookUrl(bot.id, bot.webhookToken);
    await bot.merge({ webhookUrl: actualWebhookUrl }).save();

    // 记录操作日志
    await this.logBotAction(bot.id, `create_${bot.id}`, 'create', userId, null);

    return bot;
  }

  /**
   * 获取 Bot 详情
   */
  async getBot(botId: number): Promise<Bot | null> {
    return Bot.find(botId);
  }

  /**
   * 获取 Bot 列表
   */
  async listBots(
    page = 1,
    perPage = 10,
  ): Promise<{
    data: Bot[];
    meta: { total: number; page: number; perPage: number; lastPage: number };
  }> {
    const query = Bot.query();
    const countResult = await query.clone().count('* as count');
    const total = (countResult[0] as unknown as { count: number }).count;
    const lastPage = Math.ceil(total / perPage);

    const data = await Bot.query()
      .paginate(page, perPage)
      .then((result) => result.all());

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        lastPage,
      },
    };
  }

  /**
   * 更新 Bot
   * 使用配置驱动的字段处理，消除重复代码
   */
  async updateBot(botId: number, data: UpdateBotRequest, userId: number): Promise<Bot> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    // 记录变更和待更新字段
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const fieldsToUpdate: Record<string, unknown> = {};

    // 使用配置系统处理所有字段更新
    this.processFieldUpdates(data, bot, changes, fieldsToUpdate);

    // 应用更新
    if (Object.keys(fieldsToUpdate).length > 0) {
      await bot.merge({ ...fieldsToUpdate, updaterId: userId }).save();
    }

    // 记录操作日志
    if (Object.keys(changes).length > 0) {
      await this.logBotAction(botId, `update_${botId}_${Date.now()}`, 'update', userId, changes);
    }

    return bot;
  }

  /**
   * 删除 Bot
   */
  async deleteBot(botId: number, userId: number): Promise<void> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    // 记录删除日志
    await this.logBotAction(botId, `delete_${botId}`, 'delete', userId, null);

    // 删除 Bot (级联删除相关数据)
    await bot.delete();
  }

  /**
   * 重新生成 Webhook Token
   */
  async regenerateToken(botId: number, userId: number): Promise<string> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    const newToken = this.generateWebhookToken();
    const newWebhookUrl = this.getWebhookUrl(botId, newToken);

    const changes = {
      webhookToken: { old: bot.webhookToken, new: newToken },
      webhookUrl: { old: bot.webhookUrl, new: newWebhookUrl },
    };

    await bot
      .merge({
        webhookToken: newToken,
        webhookUrl: newWebhookUrl,
        updaterId: userId,
      })
      .save();

    // 记录操作日志
    await this.logBotAction(
      botId,
      `regenerate_token_${botId}`,
      'regenerate_token',
      userId,
      changes,
    );

    return newToken;
  }

  /**
   * 获取 Webhook URL (用于公开显示)
   */
  async getWebhookUrlForBot(botId: number): Promise<string> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }
    return bot.webhookUrl;
  }

  /**
   * 测试 Bot 消息处理
   * 直接调用 bot 核心处理器，无需经过 webhook 和适配器
   * 用于快速测试 bot 的业务逻辑
   *
   * @param botId Bot ID
   * @param message 测试消息
   */
  async testBot(
    botId: number,
    message: string,
  ): Promise<{
    success: boolean;
    response: string;
    actionResult?: unknown;
    error?: string;
    processingTimeMs: number;
  }> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    const startTime = Date.now();

    try {
      // 动态导入 BotProcessor 和容器
      const { BotProcessor } = await import('../services/bot_processor.js');
      const BotEvent = (await import('../models/bot_event.js')).default;
      const app = (await import('@adonisjs/core/services/app')).default;

      console.log(`[Bot Test] Testing Bot ID: ${botId}, Message: "${message}"`);

      // 创建测试事件记录
      const botEvent = await BotEvent.create({
        botId: bot.id,
        externalEventId: `test_${Date.now()}`,
        content: message,
        externalUserId: 'test_user',
        externalUserName: 'Test User',
        status: 'pending',
        retryCount: 0,
        maxRetries: bot.maxRetries,
      });

      // 从容器获取 BotProcessor
      const botProcessor = await app.container.make(BotProcessor);

      // 使用完整的 BotProcessor 处理消息
      const result = await botProcessor.process(bot, botEvent, {
        userId: 1, // 测试用户 ID
        text: message,
        externalUserId: 'test_user',
        externalUserName: 'Test User',
      });

      // 更新事件状态
      await botEvent
        .merge({
          status: result.success ? 'completed' : 'failed',
          actionResult: result.actionResult || null,
          errorMessage: result.error || null,
          processingTimeMs: result.processingTimeMs,
        })
        .save();

      return {
        success: result.success,
        response: result.response || result.error || '',
        actionResult: result.actionResult,
        error: result.error,
        processingTimeMs: result.processingTimeMs,
      };
    } catch (error) {
      console.error(`[Bot Test] Error:`, error);
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 记录 Bot 操作日志
   */
  private async logBotAction(
    botId: number,
    eventId: string,
    action: string,
    userId: number | null,
    changes: Record<string, { old: unknown; new: unknown }> | null,
  ): Promise<void> {
    try {
      await BotLog.create({
        botId,
        eventId,
        action,
        performedBy: userId,
        changes,
        ipAddress: null, // 由 middleware 填充
        userAgent: null, // 由 middleware 填充
      });
    } catch (error) {
      console.error('Failed to log bot action:', error);
      // 不抛出错误,日志失败不应影响主业务逻辑
    }
  }
}

// 导出单例
export const botService = new BotService();
