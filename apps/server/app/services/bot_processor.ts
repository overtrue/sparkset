/**
 * Bot Processor Service
 * 核心业务逻辑层 - 处理用户消息并生成响应
 * 独立于任何接入方式（webhook、test、API）
 */

import type Bot from '../models/bot.js';

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
   * 处理用户消息
   * @param bot Bot 配置
   * @param input 处理输入
   * @returns 处理结果
   */
  async process(bot: Bot, input: BotProcessInput): Promise<BotProcessResult> {
    const startTime = Date.now();

    try {
      // TODO: 实现完整的 bot 处理逻辑
      // 1. 根据输入文本和 bot 配置调用 AI 进行意图识别
      // 2. 根据识别的意图选择执行的操作（action 或 query）
      // 3. 执行选定的操作并收集结果
      // 4. 根据结果生成响应

      // 临时实现：直接返回确认消息
      const response = `[Bot: ${bot.name}] 已接收来自用户 ${input.userId} 的消息: "${input.text}"`;

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

// 导出单例
export const botProcessor = new BotProcessor();
