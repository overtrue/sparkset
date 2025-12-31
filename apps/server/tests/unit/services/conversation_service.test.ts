import { describe, expect, it, beforeEach } from 'vitest';
import { ConversationService } from '../../../app/services/conversation_service.js';
import { InMemoryConversationRepository } from '../../../app/db/in-memory-repositories.js';

describe('ConversationService', () => {
  let service: ConversationService;
  let repository: InMemoryConversationRepository;

  beforeEach(() => {
    repository = new InMemoryConversationRepository();
    service = new ConversationService(repository);
  });

  describe('create', () => {
    it('should create a conversation', async () => {
      const result = await service.create({ title: 'Test Conversation' });

      expect(result.id).toBeDefined();
      expect(result.title).toBe('Test Conversation');
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create conversation with userId', async () => {
      const result = await service.create({ title: 'Test', userId: 42 });

      expect(result.userId).toBe(42);
    });
  });

  describe('list', () => {
    it('should return empty list initially', async () => {
      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should return created conversations', async () => {
      await service.create({ title: 'First' });
      await service.create({ title: 'Second' });

      const result = await service.list();

      expect(result).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.get(999);

      expect(result).toBeNull();
    });

    it('should return conversation by id', async () => {
      const created = await service.create({ title: 'Test' });

      const result = await service.get(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
    });
  });

  describe('appendMessage', () => {
    it('should append message to conversation', async () => {
      const conv = await service.create({ title: 'Test' });

      const message = await service.appendMessage({
        conversationId: conv.id,
        role: 'user',
        content: 'Hello!',
      });

      expect(message.id).toBeDefined();
      expect(message.conversationId).toBe(conv.id);
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello!');
    });

    it('should append multiple messages', async () => {
      const conv = await service.create({ title: 'Test' });

      await service.appendMessage({
        conversationId: conv.id,
        role: 'user',
        content: 'Hello!',
      });
      await service.appendMessage({
        conversationId: conv.id,
        role: 'assistant',
        content: 'Hi there!',
      });

      const messages = await service.messagesByConversation(conv.id);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });

    it('should throw for non-existent conversation', async () => {
      await expect(
        service.appendMessage({
          conversationId: 999,
          role: 'user',
          content: 'Hello!',
        }),
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('messagesByConversation', () => {
    it('should return empty array for conversation with no messages', async () => {
      const conv = await service.create({ title: 'Test' });

      const result = await service.messagesByConversation(conv.id);

      expect(result).toEqual([]);
    });

    it('should return empty array for non-existent conversation', async () => {
      const result = await service.messagesByConversation(999);

      expect(result).toEqual([]);
    });
  });
});
