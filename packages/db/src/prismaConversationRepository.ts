import { PrismaClient } from '@prisma/client';
import { Conversation, Message, Role } from '@sparkset/models';

export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  get(id: number): Promise<Conversation | null>;
  create(input: { title?: string; userId?: number }): Promise<Conversation>;
  appendMessage(input: {
    conversationId: number;
    role: Role;
    content: string;
    metadata?: unknown;
  }): Promise<Message>;
  messages(id: number): Promise<Message[]>;
}

export class PrismaConversationRepository implements ConversationRepository {
  constructor(private prisma: PrismaClient) {}

  async list(): Promise<Conversation[]> {
    const rows = await this.prisma.conversation.findMany({ orderBy: { id: 'desc' } });
    return rows.map(this.mapConversation);
  }

  async get(id: number): Promise<Conversation | null> {
    const row = await this.prisma.conversation.findUnique({ where: { id } });
    return row ? this.mapConversation(row) : null;
  }

  async create(input: { title?: string; userId?: number }): Promise<Conversation> {
    const row = await this.prisma.conversation.create({ data: input });
    return this.mapConversation(row);
  }

  async appendMessage(input: {
    conversationId: number;
    role: Role;
    content: string;
    metadata?: unknown;
  }): Promise<Message> {
    const row = await this.prisma.message.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata as object | undefined,
      },
    });
    return this.mapMessage(row);
  }

  async messages(id: number): Promise<Message[]> {
    const rows = await this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { id: 'asc' },
    });
    return rows.map(this.mapMessage);
  }

  private mapConversation = (row: {
    id: number;
    userId: number | null;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Conversation => ({
    id: row.id,
    userId: row.userId ?? undefined,
    title: row.title ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

  private mapMessage = (row: {
    id: number;
    conversationId: number;
    role: Role;
    content: string;
    metadata: unknown;
    createdAt: Date;
  }): Message => ({
    id: row.id,
    conversationId: row.conversationId,
    role: row.role,
    content: row.content,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt,
  });
}
