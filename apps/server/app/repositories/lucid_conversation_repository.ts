import type { ConversationRepository } from '../db/interfaces';
import ConversationModel from '../models/conversation.js';
import MessageModel from '../models/message.js';
import type { Conversation, Message, Role } from '../models/types';

export class LucidConversationRepository implements ConversationRepository {
  async list(): Promise<Conversation[]> {
    const rows = await ConversationModel.query().orderBy('id', 'desc');
    return rows.map(this.mapConversation);
  }

  async listByUserId(userId: number): Promise<Conversation[]> {
    const rows = await ConversationModel.query().where('userId', userId).orderBy('id', 'desc');
    return rows.map(this.mapConversation);
  }

  async get(id: number): Promise<Conversation | null> {
    const row = await ConversationModel.find(id);
    return row ? this.mapConversation(row) : null;
  }

  async create(input: { title?: string; userId?: number }): Promise<Conversation> {
    const row = await ConversationModel.create({
      title: input.title ?? null,
      userId: input.userId ?? null,
    });
    return this.mapConversation(row);
  }

  async findByBotAndExternalUser(
    botId: number,
    externalUserId: string,
  ): Promise<Conversation | null> {
    const row = await ConversationModel.query()
      .where('botId', botId)
      .where('externalUserId', externalUserId)
      .orderBy('updatedAt', 'desc')
      .first();
    return row ? this.mapConversation(row) : null;
  }

  async createWithBotContext(input: {
    title?: string;
    userId?: number;
    botId: number;
    externalUserId: string;
  }): Promise<Conversation> {
    const row = await ConversationModel.create({
      title: input.title ?? null,
      userId: input.userId ?? null,
      botId: input.botId,
      externalUserId: input.externalUserId,
    });
    return this.mapConversation(row);
  }

  async appendMessage(input: {
    conversationId: number;
    role: Role;
    content: string;
    metadata?: unknown;
  }): Promise<Message> {
    const row = await MessageModel.create({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? null,
    });
    return this.mapMessage(row);
  }

  async messages(id: number): Promise<Message[]> {
    const rows = await MessageModel.query().where('conversationId', id).orderBy('id', 'asc');
    return rows.map(this.mapMessage);
  }

  private mapConversation = (row: ConversationModel): Conversation => ({
    id: row.id,
    userId: row.userId ?? undefined,
    title: row.title ?? undefined,
    createdAt: row.createdAt.toJSDate(),
    updatedAt: row.updatedAt.toJSDate(),
  });

  private mapMessage = (row: MessageModel): Message => ({
    id: row.id,
    conversationId: row.conversationId,
    role: row.role as Role,
    content: row.content,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt.toJSDate(),
  });
}
