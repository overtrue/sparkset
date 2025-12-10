import { Conversation, Message, Role } from '@sparkline/models';

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

  list(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  get(id: number) {
    return this.conversations.get(id);
  }

  messagesByConversation(id: number) {
    return this.messages.get(id) ?? [];
  }

  create(input: CreateConversationInput): Conversation {
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

  appendMessage(input: AppendMessageInput): Message {
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
