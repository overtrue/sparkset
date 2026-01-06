import type { ParsedMessage } from '../types/bot_adapter.js';
import Bot from '../models/bot.js';
import BotEvent from '../models/bot_event.js';

/**
 * Intent detection result
 */
export interface IntentResult {
  type: 'action' | 'query' | 'unknown';
  actionId?: number;
  actionName?: string;
  confidence: number;
  reasoning: string;
}

/**
 * Message dispatcher for intent recognition and routing
 * Determines whether a message is:
 * 1. An Action invocation (e.g., "查询最近的订单")
 * 2. A natural language query (e.g., "最近30天的销售额是多少")
 * 3. Unknown (doesn't match any pattern)
 */
export class MessageDispatcher {
  /**
   * Detect intent from user message
   * Returns the detected intent type and relevant metadata
   */
  async detectIntent(bot: Bot, message: ParsedMessage): Promise<IntentResult> {
    const text = message.text.toLowerCase().trim();

    // 1. Try to match against bot's enabled actions
    if (bot.enabledActions && bot.enabledActions.length > 0) {
      const actionMatch = await this.matchAction(text, bot.enabledActions);
      if (actionMatch) {
        return {
          type: 'action',
          actionId: actionMatch.id,
          actionName: actionMatch.name,
          confidence: 0.8,
          reasoning: `Matched action keyword: ${actionMatch.name}`,
        };
      }
    }

    // 2. Check if query is enabled
    if (bot.enableQuery) {
      // Simple heuristic: if message contains question marks or query keywords, treat as query
      const isQuery = this.isQueryLike(text);
      if (isQuery) {
        return {
          type: 'query',
          confidence: 0.6,
          reasoning: 'Message appears to be a natural language query',
        };
      }
    }

    // 3. Default to unknown
    return {
      type: 'unknown',
      confidence: 0,
      reasoning: 'No matching action or query pattern',
    };
  }

  /**
   * Try to match message text against available actions
   */
  private async matchAction(
    text: string,
    enabledActionIds: number[],
  ): Promise<{ id: number; name: string } | null> {
    // TODO: Phase 2.3 - Implement actual action matching
    // For now, simple substring matching
    // In production, this would:
    // 1. Query actions from database
    // 2. Use semantic matching or ML model
    // 3. Return best match with confidence score

    // Example of what would happen:
    // const actions = await Action.query().whereIn('id', enabledActionIds);
    // return actions.find(action =>
    //   text.includes(action.name.toLowerCase())
    // );

    void text;
    void enabledActionIds;
    return null;
  }

  /**
   * Check if text looks like a query (question-like)
   */
  private isQueryLike(text: string): boolean {
    // Query indicators
    const queryKeywords = [
      '多少', // how much/many
      '是什么', // what is
      '怎么', // how
      '为什么', // why
      '什么时候', // when
      '在哪', // where
      '哪个', // which
      '查询', // query
      '查', // search
      '找', // find
      '统计', // statistics
      '分析', // analyze
      '数据', // data
      '报告', // report
      '统计', // count
    ];

    return queryKeywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Update BotEvent with intent detection result
   */
  async updateEventWithIntent(event: BotEvent, intent: IntentResult): Promise<void> {
    void intent;
    await event
      .merge({
        // intent_type: intent.type,
        // intent_action_id: intent.actionId || null,
      })
      .save();
  }
}

// Export singleton
export const messageDispatcher = new MessageDispatcher();
