/**
 * Bot Processor Service
 * 核心业务逻辑层 - 处理用户消息并生成响应
 * 独立于任何接入方式（webhook、test、API）
 *
 * 当前状态（Phase 2.1）：简化实现，仅返回确认消息
 * Phase 2.2 将实现完整的意图识别和动作执行
 */

import type Bot from '../models/bot.js';
import type BotEvent from '../models/bot_event.js';

/**
 * Bot 处理输入
 */
export interface BotProcessInput {
  /** 内部用户 ID */
  userId: number;
  /** 用户输入文本 */
  text: string;
  /** 外部用户 ID（来自 webhook 的原始用户标识） */
  externalUserId?: string;
  /** 外部用户名 */
  externalUserName?: string;
}

/**
 * Bot 处理结果
 */
export interface BotProcessResult {
  /** 是否成功处理 */
  success: boolean;
  /** 响应文本 */
  response: string;
  /** 操作结果详情（JSON） */
  actionResult?: unknown;
  /** 错误信息 */
  error?: string;
  /** 处理时间（毫秒） */
  processingTimeMs: number;
}

/**
 * Bot 处理器
 * 处理 bot 的核心业务逻辑
 * 所有外部请求（webhook、测试、API）都应通过此服务处理
 */
export class BotProcessor {
  /**
   * 处理用户消息（通过事件对象）
   * @param bot Bot 配置
   * @param event Bot 事件（用于记录）
   * @param input 处理输入
   * @returns 处理结果
   */
  async process(
    bot: Bot,
    event: BotEvent | unknown,
    input: BotProcessInput,
  ): Promise<BotProcessResult> {
    const startTime = Date.now();

    try {
      // Phase 2.1：临时实现 - 仅返回确认消息
      // Phase 2.2 将实现：
      // 1. 意图识别（查询 vs 动作）
      // 2. AI 驱动的参数提取
      // 3. 动作执行或查询处理
      // 4. 响应生成

      void event; // 使用参数以避免TS错误
      const response = `[Bot: ${bot.name}] 已收到您的消息: "${input.text}"`;

      return {
        success: true,
        response,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        response: '',
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
}

/**
 * 用于向后兼容的单例模式包装
 * 避免 WebhooksController 和 BotService 需要同时更改
 */
export const botProcessor = {
  /**
   * 处理用户消息（简化版本，不使用 event 参数）
   * 用于向后兼容旧的调用方式
   */
  async process(bot: Bot, input: BotProcessInput): Promise<BotProcessResult> {
    const startTime = Date.now();

    try {
      // Phase 2.1：临时实现 - 仅返回确认消息
      const response = `[Bot: ${bot.name}] 已收到您的消息: "${input.text}"`;

      return {
        success: true,
        response,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        response: '',
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  },
};

// 导出工厂函数用于未来的依赖注入
export function createBotProcessor(): BotProcessor {
  return new BotProcessor();
}
