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

interface NamedAction {
  id: number;
  name: string;
  description?: string | null;
}

/**
 * Message dispatcher for intent recognition and routing
 * Determines whether a message is:
 * 1. An Action invocation (e.g., "查询最近的订单")
 * 2. A natural language query (e.g., "最近30天的销售额是多少")
 * 3. Unknown (doesn't match any pattern)
 */
export class MessageDispatcher {
  private readonly actionScoreThreshold = 2;
  private readonly queryScoreThreshold = 1;
  private readonly queryIntentBias = 0.2;

  /**
   * Detect intent from user message
   * Returns the detected intent type and relevant metadata
   */
  async detectIntent(
    bot: Bot,
    message: ParsedMessage,
    enabledActions: NamedAction[] = [],
  ): Promise<IntentResult> {
    const text = message.text.toLowerCase().trim();

    const actionCandidates = this.filterEnabledActions(enabledActions, bot.enabledActions ?? []);

    // 1. Try to match against bot's enabled actions
    const actionMatch = await this.matchAction(text, actionCandidates);
    const actionConfidence = actionMatch ? this.toIntentConfidence(actionMatch.score) : 0;
    const queryScore = this.getQueryMatchScore(text);
    const queryConfidence = this.toIntentConfidence(queryScore);
    const queryPriority = queryConfidence + (this.isQuestionTone(text) ? this.queryIntentBias : 0);

    // 2. If query is disabled, only use action intent
    if (!bot.enableQuery) {
      if (actionMatch) {
        return {
          type: 'action',
          actionId: actionMatch.id,
          actionName: actionMatch.name,
          confidence: actionConfidence,
          reasoning: `Matched action keyword: ${actionMatch.name}`,
        };
      }

      return {
        type: 'unknown',
        confidence: 0,
        reasoning: 'No matching action and query is disabled',
      };
    }

    // 3. Query is preferred when query intent is explicit and stronger than action intent
    if (
      queryScore >= this.queryScoreThreshold &&
      queryPriority >= actionConfidence &&
      queryScore >= this.actionScoreThreshold
    ) {
      return {
        type: 'query',
        confidence: queryConfidence,
        reasoning:
          'Message includes explicit query indicators, query intent is stronger than action intent',
      };
    }

    // 3. Compare query/action confidence to avoid wrong routing
    if (queryConfidence >= 0.45 && queryConfidence + this.queryIntentBias >= actionConfidence) {
      return {
        type: 'query',
        confidence: queryConfidence,
        reasoning:
          'Message appears to be a natural language query, with query intent higher than action intent',
      };
    }

    if (actionMatch && actionConfidence >= this.toIntentConfidence(this.actionScoreThreshold)) {
      return {
        type: 'action',
        actionId: actionMatch.id,
        actionName: actionMatch.name,
        confidence: actionConfidence,
        reasoning: `Matched action keyword: ${actionMatch.name}`,
      };
    }

    if (this.isQueryLike(text)) {
      return {
        type: 'query',
        confidence: queryConfidence,
        reasoning: 'Message appears to be a natural language query',
      };
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
    candidateActions: NamedAction[],
  ): Promise<{ id: number; name: string; score: number } | null> {
    if (!candidateActions.length) {
      return null;
    }

    const normalizedText = ` ${text} `;
    let bestMatch: { id: number; name: string; score: number } | null = null;

    for (const action of candidateActions) {
      const normalizedName = action.name?.toLowerCase().trim() ?? '';
      if (!normalizedName) {
        continue;
      }

      const normalizedDescription = action.description?.toLowerCase() ?? '';
      const nameTokens = this.tokenize(normalizedName);
      const descriptionTokens = this.tokenize(normalizedDescription);

      let score = 0;
      if (this.includesToken(normalizedText, normalizedName)) {
        score += 4;
      }

      score += nameTokens.filter(
        (token) => token.length > 1 && this.includesToken(text, token),
      ).length;

      if (normalizedDescription) {
        score += descriptionTokens.filter(
          (token) => token.length > 1 && this.includesToken(text, token),
        ).length;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          id: action.id,
          name: action.name,
          score,
        };
      }
    }

    if (bestMatch && bestMatch.score >= this.actionScoreThreshold) {
      return {
        id: bestMatch.id,
        name: bestMatch.name,
        score: bestMatch.score,
      };
    }

    return null;
  }

  /**
   * Check token presence with optional boundary support.
   * 1) direct inclusion for CJK / contiguous phrases
   * 2) boundary-aware check for Latin/short words
   */
  private includesToken(text: string, token: string): boolean {
    if (!token) {
      return false;
    }

    const normalizedToken = token.trim().toLowerCase();
    if (!normalizedToken) {
      return false;
    }

    if (text.includes(` ${normalizedToken} `)) {
      return true;
    }

    if (text.includes(normalizedToken)) {
      return true;
    }

    const boundaryRegex = new RegExp(
      `(?:^|[^\\p{L}\\p{N}_-])${normalizedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}(?:$|[^\\p{L}\\p{N}_-])`,
      'giu',
    );
    return boundaryRegex.test(text);
  }

  /**
   * Filter actions by bot enabled IDs and keep stable result set
   */
  private filterEnabledActions(
    actionCatalog: NamedAction[],
    enabledActionIds: number[],
  ): NamedAction[] {
    const enabledSet = new Set(enabledActionIds);
    return actionCatalog.filter((action) => enabledSet.has(action.id));
  }

  /**
   * tokenize keywords for matching
   */
  private tokenize(value: string): string[] {
    return value
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 1);
  }

  /**
   * Check if text looks like a query (question-like)
   */
  private isQueryLike(text: string): boolean {
    return this.getQueryMatchScore(text) >= 1;
  }

  private getQueryMatchScore(text: string): number {
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
      'what',
      'why',
      'when',
      'where',
      'who',
      'which',
      'how',
      'show',
      'list',
      'find',
    ];

    return queryKeywords.reduce((acc, keyword) => acc + (text.includes(keyword) ? 1 : 0), 0);
  }

  private isQuestionTone(text: string): boolean {
    const questionKeywords = [
      '吗',
      '呢',
      '吧',
      '?',
      '？',
      '请',
      'could you',
      'can you',
      'how',
      'what',
      'why',
      'please',
      '帮我',
      '告诉',
    ];

    return questionKeywords.some((keyword) => text.includes(keyword));
  }

  private toIntentConfidence(score: number): number {
    return Math.max(0, Math.min(1, score / 7));
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
