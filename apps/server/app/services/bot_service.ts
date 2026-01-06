import { randomBytes } from 'crypto';
import Bot from '../models/bot.js';
import BotLog from '../models/bot_log.js';
import type { CreateBotRequest, UpdateBotRequest } from '../types/bot.js';

/**
 * Bot 业务逻辑服务
 * 处理 Bot 的创建、更新、删除、查询等操作
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
   */
  async updateBot(botId: number, data: UpdateBotRequest, userId: number): Promise<Bot> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    // 记录变更
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const fieldsToUpdate: Record<string, unknown> = {};

    // 检查每个可更新的字段
    if (data.name !== undefined && data.name !== bot.name) {
      changes['name'] = { old: bot.name, new: data.name };
      fieldsToUpdate['name'] = data.name;
    }
    if (data.description !== undefined && data.description !== bot.description) {
      changes['description'] = { old: bot.description, new: data.description };
      fieldsToUpdate['description'] = data.description;
    }
    if (
      data.adapterConfig !== undefined &&
      JSON.stringify(data.adapterConfig) !== JSON.stringify(bot.adapterConfig)
    ) {
      changes['adapterConfig'] = { old: bot.adapterConfig, new: data.adapterConfig };
      fieldsToUpdate['adapterConfig'] = data.adapterConfig;
    }
    if (
      data.enabledActions !== undefined &&
      JSON.stringify(data.enabledActions) !== JSON.stringify(bot.enabledActions)
    ) {
      changes['enabledActions'] = { old: bot.enabledActions, new: data.enabledActions };
      fieldsToUpdate['enabledActions'] = data.enabledActions;
    }
    if (
      data.enabledDataSources !== undefined &&
      JSON.stringify(data.enabledDataSources) !== JSON.stringify(bot.enabledDataSources)
    ) {
      changes['enabledDataSources'] = { old: bot.enabledDataSources, new: data.enabledDataSources };
      fieldsToUpdate['enabledDataSources'] = data.enabledDataSources;
    }
    if (
      data.defaultDataSourceId !== undefined &&
      data.defaultDataSourceId !== bot.defaultDataSourceId
    ) {
      changes['defaultDataSourceId'] = {
        old: bot.defaultDataSourceId,
        new: data.defaultDataSourceId,
      };
      fieldsToUpdate['defaultDataSourceId'] = data.defaultDataSourceId;
    }
    if (data.aiProviderId !== undefined && data.aiProviderId !== bot.aiProviderId) {
      changes['aiProviderId'] = { old: bot.aiProviderId, new: data.aiProviderId };
      fieldsToUpdate['aiProviderId'] = data.aiProviderId;
    }
    if (data.enableQuery !== undefined && data.enableQuery !== bot.enableQuery) {
      changes['enableQuery'] = { old: bot.enableQuery, new: data.enableQuery };
      fieldsToUpdate['enableQuery'] = data.enableQuery;
    }
    if (data.isActive !== undefined && data.isActive !== bot.isActive) {
      changes['isActive'] = { old: bot.isActive, new: data.isActive };
      fieldsToUpdate['isActive'] = data.isActive;
    }
    if (data.isVerified !== undefined && data.isVerified !== bot.isVerified) {
      changes['isVerified'] = { old: bot.isVerified, new: data.isVerified };
      fieldsToUpdate['isVerified'] = data.isVerified;
    }
    if (data.rateLimit !== undefined && data.rateLimit !== bot.rateLimit) {
      changes['rateLimit'] = { old: bot.rateLimit, new: data.rateLimit };
      fieldsToUpdate['rateLimit'] = data.rateLimit;
    }
    if (data.maxRetries !== undefined && data.maxRetries !== bot.maxRetries) {
      changes['maxRetries'] = { old: bot.maxRetries, new: data.maxRetries };
      fieldsToUpdate['maxRetries'] = data.maxRetries;
    }
    if (data.requestTimeout !== undefined && data.requestTimeout !== bot.requestTimeout) {
      changes['requestTimeout'] = { old: bot.requestTimeout, new: data.requestTimeout };
      fieldsToUpdate['requestTimeout'] = data.requestTimeout;
    }

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
   * 通过调用实际的 webhook 端点来测试 bot
   * 这会走完整的 bot 处理流程，包括消息解析、事件创建等
   */
  async testBot(
    botId: number,
    message: string,
    platform?: string,
  ): Promise<{
    success: boolean;
    message: string;
    eventId?: number;
    error?: string;
  }> {
    const bot = await this.getBot(botId);
    if (!bot) {
      throw new Error(`Bot with ID ${botId} not found`);
    }

    try {
      // 构造测试消息负载，模拟外部平台的请求
      const testPayload = this.constructTestPayload(message, platform || bot.type);

      console.log(`[Bot Test] Bot ID: ${botId}, Message: ${message}, Platform: ${platform}`);
      console.log(`[Bot Test] Payload:`, JSON.stringify(testPayload, null, 2));

      // 调用实际的 webhook 端点来处理测试消息
      const baseUrl = process.env.API_BASE_URL || 'http://localhost:3333';
      const webhookUrl = `${baseUrl}/webhooks/bot/${botId}/${bot.webhookToken}`;
      console.log(`[Bot Test] Calling webhook: ${webhookUrl}`);

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPayload),
          signal: AbortSignal.timeout(10000),
        });

        const responseData = (await response
          .json()
          .catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;
        console.log(`[Bot Test] Webhook response (${response.status}):`, responseData);

        // 从响应中获取事件 ID（如果有）
        const eventId = responseData?.eventId || responseData?.event_id;

        return {
          success: true,
          message: 'Test message sent to bot for processing',
          eventId: eventId ? Number(eventId) : undefined,
        };
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';

        // 如果是超时或网络错误，返回失败
        if (
          errorMessage.includes('timeout') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('abort')
        ) {
          throw new Error(`Webhook call failed: ${errorMessage}`);
        }

        // 其他错误也返回失败
        throw fetchError;
      }
    } catch (error) {
      console.error(`[Bot Test Error] Bot ID: ${botId}:`, error);
      return {
        success: false,
        message: 'Failed to test bot',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 构造测试消息负载
   * 根据平台类型返回相应格式的消息
   */
  private constructTestPayload(message: string, platform: string): Record<string, unknown> {
    const basePayload = {
      text: message,
      timestamp: new Date().toISOString(),
      sender: {
        id: 'test_user',
        name: 'Test User',
      },
    };

    switch (platform.toLowerCase()) {
      case 'wecom':
        return {
          ...basePayload,
          msgtype: 'text',
          touser: 'test_user',
          agentid: 'test_agent',
        };
      case 'discord':
        return {
          ...basePayload,
          author: {
            id: 'test_user',
            username: 'Test User',
          },
          channel_id: 'test_channel',
        };
      case 'slack':
        return {
          ...basePayload,
          user: 'test_user',
          channel: 'test_channel',
          type: 'message',
        };
      case 'telegram':
        return {
          ...basePayload,
          chat: {
            id: 'test_chat',
            type: 'private',
          },
          from: {
            id: 'test_user',
            first_name: 'Test',
            username: 'test_user',
          },
        };
      default:
        return basePayload;
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
