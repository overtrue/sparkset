import type { ConversationRepository } from '../db/interfaces.js';
import type { Conversation, Message, Role } from '../models/types.js';

export interface CreateConversationInput {
  title?: string;
  userId?: number;
}

export interface AppendMessageInput {
  conversationId: number;
  role: Role;
  content: string;
  metadata?: unknown;
}

/**
 * Conversation service that uses a repository for data access.
 * The repository must be provided - use InMemoryConversationRepository for testing
 * or LucidConversationRepository for production.
 */
export class ConversationService {
  constructor(private repo: ConversationRepository) {}

  async list(): Promise<Conversation[]> {
    return this.repo.list();
  }

  async listByUserId(userId: number): Promise<Conversation[]> {
    return this.repo.listByUserId(userId);
  }

  async get(id: number): Promise<Conversation | null | undefined> {
    return this.repo.get(id);
  }

  async messagesByConversation(id: number): Promise<Message[]> {
    return this.repo.messages(id);
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    return this.repo.create(input);
  }

  async appendMessage(input: AppendMessageInput): Promise<Message> {
    return this.repo.appendMessage(input);
  }
}
