import type Bot from '../models/bot.js';
import type BotEvent from '../models/bot_event.js';
import Conversation from '../models/conversation.js';
import Message from '../models/message.js';
import { QueryService, type QueryRequest, type QueryResponse } from './query_service.js';

/**
 * Result of query processing
 */
export interface QueryProcessingResult {
  success: boolean;
  response?: string;
  data?: unknown;
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Query Processor for Bot AI queries
 * Processes natural language queries in the context of a bot interaction
 *
 * Flow:
 * 1. Check if query is enabled for the bot
 * 2. Get or create conversation for this user
 * 3. Execute query using QueryService
 * 4. Format response for bot
 * 5. Save conversation history
 */
export class BotQueryProcessor {
  constructor(private queryService: QueryService) {}

  /**
   * Process a natural language query in bot context
   */
  async processQuery(
    bot: Bot,
    event: BotEvent,
    userMessage: string,
  ): Promise<QueryProcessingResult> {
    try {
      // 1. Check if query is enabled
      if (!bot.enableQuery) {
        return {
          success: false,
          error: {
            message: 'Query feature is not enabled for this bot',
            code: 'QUERY_DISABLED',
          },
        };
      }

      // 2. Get or create conversation
      // For now, create a new conversation per user per bot
      // In a real implementation, we might track by user + bot
      const conversation = await this.getOrCreateConversation(event);

      // 3. Build query request
      // Use bot's configured datasource and AI provider if available
      const queryRequest: QueryRequest = {
        question: userMessage,
        // Optional: Use bot's configured AI provider if available
        aiProvider: bot.aiProviderId || undefined,
        limit: 100,
      };

      // 4. Execute query
      const queryResponse = await this.queryService.run(queryRequest);

      // 5. Format response for bot
      const formattedResponse = this.formatQueryResponse(queryResponse);

      // 6. Save conversation history
      await this.saveConversationHistory(conversation, userMessage, formattedResponse);

      return {
        success: true,
        response: formattedResponse,
        data: queryResponse,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Query processing failed',
          code: 'PROCESSING_ERROR',
        },
      };
    }
  }

  /**
   * Get or create conversation for a bot event
   */
  private async getOrCreateConversation(event: BotEvent): Promise<Conversation> {
    // Use internalUserId from event if available, otherwise use default user (ID: 1)
    // This is required because user_id is NOT NULL in the database
    const userId = event.internalUserId ?? 1;

    // Create a new conversation for this interaction
    // In Phase 2.4 enhancement, this is handled by ConversationTracker
    // but for backward compatibility, we keep this method working
    const conversation = await Conversation.create({
      userId,
      title: `Bot query: ${event.externalUserId}`,
      botId: event.botId,
      externalUserId: event.externalUserId,
    });

    return conversation;
  }

  /**
   * Format query response for bot display
   * Converts structured query results to human-readable text
   */
  private formatQueryResponse(queryResponse: QueryResponse): string {
    try {
      // Always format data rows if available - this gives users the actual results
      if (queryResponse.rows && queryResponse.rows.length > 0) {
        return this.formatDataRows(queryResponse.rows);
      }

      // No data found
      return '查询未找到数据。';
    } catch (error) {
      void error;
      return '无法格式化响应，请重试。';
    }
  }

  /**
   * Format data rows for readable text output
   */
  private formatDataRows(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) {
      return '查询结果为空。';
    }

    // Single row with single value (e.g., COUNT(*) result)
    // Return it in a more natural format
    if (rows.length === 1) {
      const row = rows[0];
      const entries = Object.entries(row);

      // Single value result (like "user_count: 6")
      if (entries.length === 1) {
        const [key, value] = entries[0];
        // Format the key to be more readable
        const readableKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return `${readableKey}: ${this.formatValue(value)}`;
      }

      // Single row with multiple columns
      return entries.map(([key, value]) => `${key}: ${this.formatValue(value)}`).join('\n');
    }

    // For small result sets (2-5 rows), show all as text
    if (rows.length <= 5) {
      return rows
        .map((row, idx) => {
          const entries = Object.entries(row)
            .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
            .join(', ');
          return `${idx + 1}. ${entries}`;
        })
        .join('\n');
    }

    // For larger result sets, show summary with first 5
    return `共 ${rows.length} 条结果，显示前 5 条：\n${rows
      .slice(0, 5)
      .map((row, idx) => {
        const entries = Object.entries(row)
          .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
          .join(', ');
        return `${idx + 1}. ${entries}`;
      })
      .join('\n')}`;
  }

  /**
   * Format individual value for display
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value as Record<string, unknown>);
    }
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return String(value);
  }

  /**
   * Save conversation history (user message + assistant response)
   */
  private async saveConversationHistory(
    conversation: Conversation,
    userMessage: string,
    assistantResponse: string,
  ): Promise<void> {
    try {
      // Save user message
      await Message.create({
        conversationId: conversation.id,
        role: 'user',
        content: userMessage,
      });

      // Save assistant response
      await Message.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantResponse,
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Failed to save conversation history:', error);
    }
  }
}

// Export factory function for DI
export function createBotQueryProcessor(queryService: QueryService): BotQueryProcessor {
  return new BotQueryProcessor(queryService);
}
