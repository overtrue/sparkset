/**
 * Conversation Tracker Service
 * Manages conversation context for bot interactions
 *
 * Phase 2.4: Provides multi-turn dialog support by:
 * 1. Creating/retrieving conversations for bot users
 * 2. Storing user messages and bot responses
 * 3. Providing conversation history for AI context
 * 4. Managing session state per user
 */

import type { ConversationRepository } from '../db/interfaces.js';
import type { Message, Role } from '../models/types.js';
import type Bot from '../models/bot.js';
import type BotEvent from '../models/bot_event.js';

/**
 * Conversation context for AI prompts
 */
export interface ConversationContext {
  /** Conversation ID */
  conversationId: number;
  /** Recent messages for context (newest last) */
  messages: ConversationMessage[];
  /** Total message count in conversation */
  totalMessages: number;
  /** Conversation created timestamp */
  createdAt: Date;
}

/**
 * Message in conversation context
 */
export interface ConversationMessage {
  role: Role;
  content: string;
  timestamp: Date;
  metadata?: unknown;
}

/**
 * Options for getting conversation context
 */
export interface ContextOptions {
  /** Maximum number of recent messages to include */
  maxMessages?: number;
  /** Include metadata in messages */
  includeMetadata?: boolean;
}

/**
 * Conversation Tracker Service
 * Manages bot conversation context and history
 */
export class ConversationTracker {
  /** Default number of messages to include in context */
  private static readonly DEFAULT_CONTEXT_MESSAGES = 10;

  /** In-memory cache for active conversations (userId -> conversationId) */
  private activeConversations = new Map<string, number>();

  constructor(private conversationRepo: ConversationRepository) {}

  /**
   * Get or create a conversation for a bot user
   * Uses external user ID to maintain continuity across sessions
   *
   * @param bot Bot configuration
   * @param externalUserId External user identifier from webhook
   * @param internalUserId Optional internal user ID
   * @returns Conversation context
   */
  async getOrCreateConversation(
    bot: Bot,
    externalUserId: string,
    internalUserId?: number,
  ): Promise<ConversationContext> {
    // Build cache key combining bot and user
    const cacheKey = this.buildCacheKey(bot.id, externalUserId);

    // Check cache first
    const cachedConversationId = this.activeConversations.get(cacheKey);
    if (cachedConversationId) {
      const context = await this.getConversationContext(cachedConversationId);
      if (context) {
        return context;
      }
      // Cache invalid, remove it
      this.activeConversations.delete(cacheKey);
    }

    // Create new conversation
    const title = `Bot ${bot.name} - User ${externalUserId}`;
    const conversation = await this.conversationRepo.create({
      title,
      userId: internalUserId,
    });

    // Cache for future requests
    this.activeConversations.set(cacheKey, conversation.id);

    return {
      conversationId: conversation.id,
      messages: [],
      totalMessages: 0,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Get conversation context by ID
   *
   * @param conversationId Conversation ID
   * @param options Context options
   * @returns Conversation context or null if not found
   */
  async getConversationContext(
    conversationId: number,
    options: ContextOptions = {},
  ): Promise<ConversationContext | null> {
    const conversation = await this.conversationRepo.get(conversationId);
    if (!conversation) {
      return null;
    }

    const maxMessages = options.maxMessages ?? ConversationTracker.DEFAULT_CONTEXT_MESSAGES;
    const allMessages = await this.conversationRepo.messages(conversationId);

    // Get recent messages (newest last for chronological order)
    const recentMessages = allMessages.slice(-maxMessages);

    const contextMessages: ConversationMessage[] = recentMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
      metadata: options.includeMetadata ? msg.metadata : undefined,
    }));

    return {
      conversationId,
      messages: contextMessages,
      totalMessages: allMessages.length,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * Record a user message in the conversation
   *
   * @param conversationId Conversation ID
   * @param content Message content
   * @param metadata Optional metadata
   * @returns Created message
   */
  async recordUserMessage(
    conversationId: number,
    content: string,
    metadata?: unknown,
  ): Promise<Message> {
    return this.conversationRepo.appendMessage({
      conversationId,
      role: 'user',
      content,
      metadata,
    });
  }

  /**
   * Record a bot/assistant response in the conversation
   *
   * @param conversationId Conversation ID
   * @param content Response content
   * @param metadata Optional metadata (e.g., action results, query data)
   * @returns Created message
   */
  async recordBotResponse(
    conversationId: number,
    content: string,
    metadata?: unknown,
  ): Promise<Message> {
    return this.conversationRepo.appendMessage({
      conversationId,
      role: 'assistant',
      content,
      metadata,
    });
  }

  /**
   * Link a BotEvent to a conversation and record the interaction
   *
   * @param event BotEvent to link
   * @param conversationId Conversation ID
   * @param responseContent Bot response content
   * @param responseMetadata Optional response metadata
   * @returns Tuple of [userMessageId, botMessageId]
   */
  async linkEventToConversation(
    event: BotEvent,
    conversationId: number,
    responseContent: string,
    responseMetadata?: unknown,
  ): Promise<[number, number]> {
    // Record user message
    const userMessage = await this.recordUserMessage(conversationId, event.content, {
      eventId: event.id,
      externalUserId: event.externalUserId,
      externalUserName: event.externalUserName,
    });

    // Record bot response
    const botMessage = await this.recordBotResponse(
      conversationId,
      responseContent,
      responseMetadata,
    );

    return [userMessage.id, botMessage.id];
  }

  /**
   * Format conversation history for AI prompt injection
   *
   * @param context Conversation context
   * @param maxTokenEstimate Rough estimate of max tokens to include
   * @returns Formatted conversation history string
   */
  formatContextForPrompt(context: ConversationContext, maxTokenEstimate = 2000): string {
    if (context.messages.length === 0) {
      return '';
    }

    const lines: string[] = [];
    let estimatedTokens = 0;

    // Process messages from oldest to newest
    for (const msg of context.messages) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      const line = `${roleLabel}: ${msg.content}`;

      // Rough token estimation (4 chars per token)
      const lineTokens = Math.ceil(line.length / 4);

      if (estimatedTokens + lineTokens > maxTokenEstimate) {
        break;
      }

      lines.push(line);
      estimatedTokens += lineTokens;
    }

    if (lines.length === 0) {
      return '';
    }

    return `Previous conversation:\n${lines.join('\n')}\n\n`;
  }

  /**
   * Clear conversation cache (useful for testing or session reset)
   */
  clearCache(): void {
    this.activeConversations.clear();
  }

  /**
   * Remove a specific conversation from cache
   *
   * @param botId Bot ID
   * @param externalUserId External user ID
   */
  invalidateCache(botId: number, externalUserId: string): void {
    const cacheKey = this.buildCacheKey(botId, externalUserId);
    this.activeConversations.delete(cacheKey);
  }

  /**
   * Build cache key from bot ID and external user ID
   * @private
   */
  private buildCacheKey(botId: number, externalUserId: string): string {
    return `${botId}:${externalUserId}`;
  }
}

/**
 * Factory function for ConversationTracker
 */
export function createConversationTracker(
  conversationRepo: ConversationRepository,
): ConversationTracker {
  return new ConversationTracker(conversationRepo);
}
