import { ConversationRepository } from '../db/interfaces';
import type { Conversation, Message, Role } from '../models/types';

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

export class ConversationService {
  private conversations = new Map<number, Conversation>();
  private messages = new Map<number, Message[]>();
  private conversationId = 1;
  private messageId = 1;

  constructor(private repo?: ConversationRepository) {}

  async list(): Promise<Conversation[]> {
    if (this.repo) return this.repo.list();
    return Array.from(this.conversations.values());
  }

  async get(id: number) {
    if (this.repo) return this.repo.get(id);
    return this.conversations.get(id);
  }

  async messagesByConversation(id: number) {
    if (this.repo) return this.repo.messages(id);
    return this.messages.get(id) ?? [];
  }

  async create(input: CreateConversationInput): Promise<Conversation> {
    if (this.repo) return this.repo.create(input);
    const now = new Date();
    const conv: Conversation = {
      id: this.conversationId++,
      title: input.title,
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conv.id, conv);
    this.messages.set(conv.id, []);
    return conv;
  }

  async appendMessage(input: AppendMessageInput): Promise<Message> {
    if (this.repo) return this.repo.appendMessage(input);
    const conv = this.conversations.get(input.conversationId);
    if (!conv) throw new Error('Conversation not found');
    const msg: Message = {
      id: this.messageId++,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata,
      createdAt: new Date(),
    };
    this.messages.get(input.conversationId)?.push(msg);
    return msg;
  }
}
