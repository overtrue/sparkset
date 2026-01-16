/**
 * Bot Processor Service
 * 核心业务逻辑层 - 处理用户消息并生成响应
 * 独立于任何接入方式（webhook、test、API）
 *
 * Phase 2.4：完整实现，支持 AI 驱动的意图识别、消息路由、参数提取和会话追踪
 */

import { generateText } from 'ai';
import type Bot from '../models/bot.js';
import type BotEvent from '../models/bot_event.js';
import type { BotQueryProcessor } from './query_processor.js';
import type { BotActionExecutor } from './action_executor.js';
import type { ParameterExtractor } from './parameter_extractor.js';
import type { ConversationTracker, ConversationContext } from './conversation_tracker.js';
import type { Action } from '../models/types.js';
import { providerFactories } from '../ai/index.js';
import type { AIProviderRepository } from '../db/interfaces.js';

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
 * 用户意图
 */
export interface UserIntent {
  /** 意图类型 */
  type: 'query' | 'action' | 'unknown';
  /** 原始用户输入文本 */
  originalText: string;
  /** 意图识别的理由 */
  reasoning: string;
  /** 置信度 (0-1) */
  confidence: number;
}

/**
 * Bot 处理器 - 完整实现
 * 处理 bot 的核心业务逻辑
 * 所有外部请求（webhook、测试、API）都应通过此服务处理
 */
export class BotProcessor {
  /** 当前会话上下文（处理期间设置） */
  private currentContext: ConversationContext | null = null;

  constructor(
    private queryProcessor?: BotQueryProcessor,
    private actionExecutor?: BotActionExecutor,
    private aiProviderRepository?: AIProviderRepository,
    private parameterExtractor?: ParameterExtractor,
    private conversationTracker?: ConversationTracker,
  ) {}

  /**
   * 处理用户消息（完整版本，使用事件对象）
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
      // 1. 获取或创建会话上下文
      let conversationContext: ConversationContext | null = null;
      if (this.conversationTracker && input.externalUserId) {
        conversationContext = await this.conversationTracker.getOrCreateConversation(
          bot,
          input.externalUserId,
          input.userId,
        );
        this.currentContext = conversationContext;
      }

      // 2. 识别用户意图（包含会话上下文）
      const intent = await this.identifyIntent(bot, input.text);

      // 3. 根据意图类型路由处理
      let result: BotProcessResult;

      if (intent.type === 'query' && bot.enableQuery && this.queryProcessor) {
        result = await this.handleQuery(bot, event as BotEvent, input, startTime);
      } else if (intent.type === 'action' && this.actionExecutor) {
        result = await this.handleAction(bot, event as BotEvent, input, startTime);
      } else {
        // 无法处理的意图
        result = {
          success: false,
          response: '',
          error: `无法处理此请求: ${intent.reasoning}`,
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 4. 记录会话历史
      if (this.conversationTracker && conversationContext && event) {
        try {
          await this.conversationTracker.linkEventToConversation(
            event as BotEvent,
            conversationContext.conversationId,
            result.response || result.error || '',
            result.actionResult,
          );
        } catch (trackingError) {
          // 记录失败不影响主流程
          console.warn('Failed to track conversation:', trackingError);
        }
      }

      // 清理当前上下文
      this.currentContext = null;

      return result;
    } catch (error) {
      this.currentContext = null;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        response: '',
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 处理查询请求
   */
  private async handleQuery(
    bot: Bot,
    event: BotEvent,
    input: BotProcessInput,
    startTime: number,
  ): Promise<BotProcessResult> {
    try {
      if (!this.queryProcessor) {
        throw new Error('Query processor not configured');
      }

      const queryResult = await this.queryProcessor.processQuery(bot, event, input.text);

      if (queryResult.success) {
        return {
          success: true,
          response: queryResult.response || '查询执行成功',
          actionResult: queryResult.data,
          processingTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        response: '',
        error: queryResult.error?.message || '查询处理失败',
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        response: '',
        error: error instanceof Error ? error.message : '查询处理异常',
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 处理动作请求
   * Phase 2.3: 完整的动作执行流程
   * Phase 2.7: 支持缺少必需参数时的澄清问题
   */
  private async handleAction(
    bot: Bot,
    event: BotEvent,
    input: BotProcessInput,
    startTime: number,
  ): Promise<BotProcessResult> {
    try {
      if (!this.actionExecutor) {
        throw new Error('Action executor not configured');
      }

      // 1. 获取 bot 支持的所有动作
      const enabledActions = await this.actionExecutor.listEnabledActions(bot);

      if (enabledActions.length === 0) {
        return {
          success: false,
          response: '',
          error: '此 Bot 未配置任何动作',
          processingTimeMs: Date.now() - startTime,
        };
      }

      // 2. 从用户输入中提取参数
      // 优先使用第一个可用动作作为上下文
      // 在 Phase 2.4 中可以改进为让 AI 选择最合适的动作
      const targetAction = enabledActions[0];
      let extractedParams: Record<string, unknown> = {};

      if (this.parameterExtractor && targetAction.inputSchema) {
        const extraction = await this.parameterExtractor.extractParameters(
          input.text,
          targetAction,
        );
        extractedParams = extraction.parameters;

        // Phase 2.7: 检查是否有缺失的必需参数
        if (extraction.missingRequired.length > 0) {
          const clarificationQuestion = this.generateClarificationQuestion(
            targetAction,
            extraction.missingRequired,
          );
          return {
            success: true,
            response: clarificationQuestion,
            processingTimeMs: Date.now() - startTime,
          };
        }

        // 如果提取参数时出现警告，记录但继续
        if (extraction.warnings.length > 0) {
          // Log warnings but continue
        }
      }

      // 3. 执行动作
      const executionResult = await this.actionExecutor.execute(bot, event, {
        ...targetAction,
        parameters: extractedParams,
      });

      // 4. 生成用户友好的响应消息
      if (executionResult.success) {
        return {
          success: true,
          response: this.formatActionSuccessResponse(targetAction),
          actionResult: executionResult.data,
          processingTimeMs: Date.now() - startTime,
        };
      }

      return {
        success: false,
        response: '',
        error: executionResult.error?.message || `执行 "${targetAction.name}" 动作失败`,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '动作执行异常';
      return {
        success: false,
        response: '',
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 生成澄清问题
   * Phase 2.7: 当缺少必需参数时，生成友好的问题询问用户
   * @private
   */
  private generateClarificationQuestion(
    action: Action,
    missingParams: { name: string; type: string; description?: string; label?: string }[],
  ): string {
    if (missingParams.length === 0) {
      return '';
    }

    // 构建问题列表
    const paramQuestions = missingParams.map((param) => {
      const label = param.label || param.name;
      const description = param.description ? ` (${param.description})` : '';
      return `- ${label}${description}`;
    });

    if (missingParams.length === 1) {
      const param = missingParams[0];
      const label = param.label || param.name;
      return `要执行 "${action.name}"，请提供 ${label}：`;
    }

    return `要执行 "${action.name}"，请提供以下信息：\n${paramQuestions.join('\n')}`;
  }

  /**
   * 格式化动作成功后的响应消息
   * @private
   */
  private formatActionSuccessResponse(action: Action): string {
    // Basic response - can be enhanced in Phase 2.4
    return `成功执行 "${action.name}" 动作`;
  }

  /**
   * 识别用户意图
   * @param bot Bot 配置
   * @param userText 用户输入文本
   * @returns 识别的意图
   */
  private async identifyIntent(bot: Bot, userText: string): Promise<UserIntent> {
    try {
      // 如果配置了 AI Provider，使用 AI 识别
      if (this.aiProviderRepository && bot.aiProviderId) {
        const aiIntent = await this.identifyIntentWithAI(bot, userText);
        if (aiIntent) {
          return aiIntent;
        }
      }

      // 降级到规则匹配
      return this.identifyIntentWithRules(userText);
    } catch (error) {
      console.warn('Failed to identify intent:', error);
      // 降级到规则匹配
      return this.identifyIntentWithRules(userText);
    }
  }

  /**
   * 使用 AI 识别意图
   */
  private async identifyIntentWithAI(bot: Bot, userText: string): Promise<UserIntent | null> {
    try {
      if (!this.aiProviderRepository || !bot.aiProviderId) {
        return null;
      }

      // 获取 AI Provider 配置
      const providers = await this.aiProviderRepository.list();
      const provider = providers.find((p) => p.id === bot.aiProviderId);

      if (!provider) {
        return null;
      }

      // 构建提示词
      const prompt = this.buildIntentPrompt(userText, bot);

      // 创建 AI 模型
      const factory = providerFactories[provider.type];
      if (!factory) {
        throw new Error(`Unsupported AI provider: ${provider.type}`);
      }

      const model = factory.createModel(provider.defaultModel || 'gpt-4o-mini', {
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
      });

      // 调用 AI 生成意图
      const result = await generateText({
        model,
        prompt,
        temperature: 0.3, // 降低温度以获得更一致的结果
      });

      // 解析 AI 响应
      return this.parseIntentResponse(result.text, userText);
    } catch (error) {
      console.warn('AI intent identification failed:', error);
      return null;
    }
  }

  /**
   * 使用规则匹配识别意图
   */
  private identifyIntentWithRules(userText: string): UserIntent {
    const lowerText = userText.toLowerCase();

    // 查询关键词
    const queryKeywords = [
      '查询',
      '获取',
      '列出',
      '显示',
      '统计',
      '数量',
      '总数',
      '有多少',
      '是多少',
      '查看',
      '看看',
      'query',
      'select',
      'get',
      'list',
      'show',
      'what',
      'how many',
      'count',
    ];

    // 动作关键词
    const actionKeywords = [
      '执行',
      '运行',
      '发送',
      '删除',
      '更新',
      '创建',
      '修改',
      '移除',
      '添加',
      '保存',
      '提交',
      'execute',
      'run',
      'send',
      'delete',
      'update',
      'create',
      'modify',
      'remove',
      'add',
      'save',
    ];

    // 检查关键词
    const isQuery = queryKeywords.some((keyword) => lowerText.includes(keyword));
    const isAction = actionKeywords.some((keyword) => lowerText.includes(keyword));

    // 如果同时匹配，优先选择查询
    if (isQuery) {
      return {
        type: 'query',
        originalText: userText,
        reasoning: '检测到查询相关关键词',
        confidence: 0.8,
      };
    }

    if (isAction) {
      return {
        type: 'action',
        originalText: userText,
        reasoning: '检测到操作相关关键词',
        confidence: 0.7,
      };
    }

    return {
      type: 'unknown',
      originalText: userText,
      reasoning: '无法确定意图类型',
      confidence: 0.0,
    };
  }

  /**
   * 构建意图识别提示词
   */
  private buildIntentPrompt(userText: string, bot: Bot): string {
    const enabledActionsCount = bot.enabledActions?.length || 0;
    const enabledDataSourcesCount = bot.enabledDataSources?.length || 0;
    const queryEnabled = bot.enableQuery ? '是' : '否';

    // 添加会话上下文（如果有）
    let conversationHistory = '';
    if (this.currentContext && this.conversationTracker) {
      conversationHistory = this.conversationTracker.formatContextForPrompt(
        this.currentContext,
        500,
      );
    }

    return `你是一个意图识别助手。根据用户的输入，判断用户的意图类型。

Bot 配置信息：
- 支持查询功能: ${queryEnabled}
- 已启用的 Actions 数量: ${enabledActionsCount}
- 已启用的数据源数量: ${enabledDataSourcesCount}
${conversationHistory ? `\n${conversationHistory}` : ''}
请分析以下用户输入，判断用户的意图是属于以下哪一种类型：
1. query: 用户想要查询或获取数据信息
2. action: 用户想要执行某个特定的操作或动作
3. unknown: 无法判断

用户输入: "${userText}"

请用以下 JSON 格式回复，只返回 JSON 对象，不要有其他文本：
{
  "type": "query" 或 "action" 或 "unknown",
  "reasoning": "简要说明判断原因（不超过 20 个字）",
  "confidence": 0.0 到 1.0 之间的数字，表示置信度
}`;
  }

  /**
   * 解析 AI 意图识别响应
   */
  private parseIntentResponse(aiResponse: string, userText: string): UserIntent | null {
    try {
      // 移除可能的 markdown 代码块
      let jsonText = aiResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // 解析 JSON
      const parsed = JSON.parse(jsonText);

      // 验证类型和置信度
      if (
        (parsed.type === 'query' || parsed.type === 'action' || parsed.type === 'unknown') &&
        typeof parsed.confidence === 'number'
      ) {
        return {
          type: parsed.type,
          originalText: userText,
          reasoning: parsed.reasoning || '',
          confidence: Math.max(0, Math.min(1, parsed.confidence)), // 确保在 0-1 之间
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to parse intent response:', error);
      return null;
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
      // 简化的处理：仅返回确认消息
      // 完整的处理需要通过依赖注入使用完整的 BotProcessor
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

/**
 * 导出工厂函数用于依赖注入
 */
export function createBotProcessor(
  queryProcessor?: BotQueryProcessor,
  actionExecutor?: BotActionExecutor,
  aiProviderRepository?: AIProviderRepository,
  parameterExtractor?: ParameterExtractor,
  conversationTracker?: ConversationTracker,
): BotProcessor {
  return new BotProcessor(
    queryProcessor,
    actionExecutor,
    aiProviderRepository,
    parameterExtractor,
    conversationTracker,
  );
}
