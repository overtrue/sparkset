import { test } from 'vitest';
import type Bot from '../../app/models/bot.js';
import type BotEvent from '../../app/models/bot_event.js';
import type { ConversationRepository } from '../../app/db/interfaces.js';
import type { Conversation, Message } from '../../app/models/types.js';
import { ConversationTracker } from '../../app/services/conversation_tracker.js';

/**
 * Integration tests for ConversationTracker
 *
 * Tests the conversation tracking flow:
 * 1. Creating and retrieving conversations
 * 2. Recording user messages and bot responses
 * 3. Formatting context for AI prompts
 * 4. Cache management
 */

// In-memory repository for testing
class InMemoryConversationRepository implements ConversationRepository {
  private conversationsStore = new Map<number, Conversation>();
  private messagesStore = new Map<number, Message[]>();
  private nextConversationId = 1;
  private nextMessageId = 1;

  async list(): Promise<Conversation[]> {
    return Array.from(this.conversationsStore.values());
  }

  async get(id: number): Promise<Conversation | null> {
    return this.conversationsStore.get(id) || null;
  }

  async messages(conversationId: number): Promise<Message[]> {
    return this.messagesStore.get(conversationId) || [];
  }

  async create(input: { title?: string; userId?: number }): Promise<Conversation> {
    const id = this.nextConversationId++;
    const conversation: Conversation = {
      id,
      title: input.title,
      userId: input.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversationsStore.set(id, conversation);
    this.messagesStore.set(id, []);
    return conversation;
  }

  async appendMessage(input: {
    conversationId: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: unknown;
  }): Promise<Message> {
    const id = this.nextMessageId++;
    const message: Message = {
      id,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata,
      createdAt: new Date(),
    };
    const msgs = this.messagesStore.get(input.conversationId) || [];
    msgs.push(message);
    this.messagesStore.set(input.conversationId, msgs);
    return message;
  }
}

// Helper to create mock Bot
function createMockBot(overrides?: Partial<Bot>): Bot {
  return {
    id: 1,
    name: 'Test Bot',
    description: 'Test Bot for conversation tracking',
    type: 'custom',
    webhookUrl: 'https://example.com/webhook',
    webhookToken: 'token123',
    adapterConfig: null,
    enabledActions: [],
    enabledDataSources: [],
    defaultDataSourceId: null,
    aiProviderId: null,
    enableQuery: true,
    isActive: true,
    isVerified: true,
    rateLimit: null,
    maxRetries: 3,
    requestTimeout: 30000,
    creatorId: null,
    updaterId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Bot;
}

// Helper to create mock BotEvent
function createMockBotEvent(overrides?: Partial<BotEvent>): BotEvent {
  return {
    id: 1,
    botId: 1,
    externalEventId: 'event123',
    content: 'Test message',
    externalUserId: 'user123',
    externalUserName: 'Test User',
    internalUserId: null,
    status: 'pending',
    actionResult: null,
    errorMessage: null,
    processingTimeMs: null,
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    conversationId: null,
    conversationMessageIds: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as BotEvent;
}

test('ConversationTracker should create new conversation for new user', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');

  expect(context.conversationId).toBe(1);
  expect(context.messages).toHaveLength(0);
  expect(context.totalMessages).toBe(0);
});

test('ConversationTracker should return cached conversation for same user', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context1 = await tracker.getOrCreateConversation(bot, 'user123');
  const context2 = await tracker.getOrCreateConversation(bot, 'user123');

  expect(context1.conversationId).toBe(context2.conversationId);
});

test('ConversationTracker should create separate conversations for different users', async ({
  expect,
}) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context1 = await tracker.getOrCreateConversation(bot, 'user123');
  const context2 = await tracker.getOrCreateConversation(bot, 'user456');

  expect(context1.conversationId).not.toBe(context2.conversationId);
});

test('ConversationTracker should create separate conversations for different bots', async ({
  expect,
}) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot1 = createMockBot({ id: 1 });
  const bot2 = createMockBot({ id: 2 });

  const context1 = await tracker.getOrCreateConversation(bot1, 'user123');
  const context2 = await tracker.getOrCreateConversation(bot2, 'user123');

  expect(context1.conversationId).not.toBe(context2.conversationId);
});

test('ConversationTracker should record user message', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  const message = await tracker.recordUserMessage(context.conversationId, 'Hello bot!');

  expect(message.role).toBe('user');
  expect(message.content).toBe('Hello bot!');
});

test('ConversationTracker should record bot response', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  const message = await tracker.recordBotResponse(context.conversationId, 'Hello human!');

  expect(message.role).toBe('assistant');
  expect(message.content).toBe('Hello human!');
});

test('ConversationTracker should get conversation context with messages', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  await tracker.recordUserMessage(context.conversationId, 'Query 1');
  await tracker.recordBotResponse(context.conversationId, 'Response 1');
  await tracker.recordUserMessage(context.conversationId, 'Query 2');
  await tracker.recordBotResponse(context.conversationId, 'Response 2');

  const updatedContext = await tracker.getConversationContext(context.conversationId);

  expect(updatedContext).not.toBeNull();
  expect(updatedContext?.messages).toHaveLength(4);
  expect(updatedContext?.totalMessages).toBe(4);
});

test('ConversationTracker should limit messages in context', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');

  // Add 20 messages
  for (let i = 0; i < 10; i++) {
    await tracker.recordUserMessage(context.conversationId, `Query ${i}`);
    await tracker.recordBotResponse(context.conversationId, `Response ${i}`);
  }

  const limitedContext = await tracker.getConversationContext(context.conversationId, {
    maxMessages: 5,
  });

  expect(limitedContext?.messages).toHaveLength(5);
  expect(limitedContext?.totalMessages).toBe(20);
});

test('ConversationTracker should link event to conversation', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();
  const event = createMockBotEvent({ content: 'User query' });

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  const [userMsgId, botMsgId] = await tracker.linkEventToConversation(
    event,
    context.conversationId,
    'Bot response',
    { actionResult: 'success' },
  );

  expect(userMsgId).toBe(1);
  expect(botMsgId).toBe(2);

  const updatedContext = await tracker.getConversationContext(context.conversationId);
  expect(updatedContext?.messages).toHaveLength(2);
});

test('ConversationTracker should format context for prompt', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  await tracker.recordUserMessage(context.conversationId, 'What is the weather?');
  await tracker.recordBotResponse(context.conversationId, 'It is sunny today.');

  const updatedContext = await tracker.getConversationContext(context.conversationId);
  const formatted = tracker.formatContextForPrompt(updatedContext!);

  expect(formatted).toContain('Previous conversation:');
  expect(formatted).toContain('User: What is the weather?');
  expect(formatted).toContain('Assistant: It is sunny today.');
});

test('ConversationTracker should return empty string for empty context', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  const formatted = tracker.formatContextForPrompt(context);

  expect(formatted).toBe('');
});

test('ConversationTracker should clear cache', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context1 = await tracker.getOrCreateConversation(bot, 'user123');
  tracker.clearCache();
  const context2 = await tracker.getOrCreateConversation(bot, 'user123');

  // After cache clear, should create a new conversation
  expect(context1.conversationId).not.toBe(context2.conversationId);
});

test('ConversationTracker should invalidate specific cache entry', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context1 = await tracker.getOrCreateConversation(bot, 'user123');
  await tracker.getOrCreateConversation(bot, 'user456');

  tracker.invalidateCache(bot.id, 'user123');

  const context3 = await tracker.getOrCreateConversation(bot, 'user123');
  const context4 = await tracker.getOrCreateConversation(bot, 'user456');

  // user123 should have new conversation, user456 should use cached
  expect(context1.conversationId).not.toBe(context3.conversationId);
  expect(context4.conversationId).toBe(2); // Still using cached
});

test('ConversationTracker should return null for non-existent conversation', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);

  const context = await tracker.getConversationContext(999);

  expect(context).toBeNull();
});

test('ConversationTracker should store metadata with messages', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');
  await tracker.recordUserMessage(context.conversationId, 'Query', { source: 'test' });
  await tracker.recordBotResponse(context.conversationId, 'Response', { action: 'query' });

  const updatedContext = await tracker.getConversationContext(context.conversationId, {
    includeMetadata: true,
  });

  expect(updatedContext?.messages[0].metadata).toEqual({ source: 'test' });
  expect(updatedContext?.messages[1].metadata).toEqual({ action: 'query' });
});

test('ConversationTracker should handle token limit in prompt formatting', async ({ expect }) => {
  const repo = new InMemoryConversationRepository();
  const tracker = new ConversationTracker(repo);
  const bot = createMockBot();

  const context = await tracker.getOrCreateConversation(bot, 'user123');

  // Add many long messages
  for (let i = 0; i < 20; i++) {
    await tracker.recordUserMessage(context.conversationId, 'A'.repeat(100));
    await tracker.recordBotResponse(context.conversationId, 'B'.repeat(100));
  }

  const updatedContext = await tracker.getConversationContext(context.conversationId);
  // With very small token limit, should truncate
  const formatted = tracker.formatContextForPrompt(updatedContext!, 50);

  // Should be much shorter than full context
  expect(formatted.length).toBeLessThan(500);
});
