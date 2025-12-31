/**
 * In-memory repository implementations
 *
 * These implementations are used when no database is available,
 * such as in development or testing scenarios.
 */

import type {
  ActionRepository,
  AIProviderRepository,
  ConversationRepository,
  DatasourceRepository,
} from './interfaces.js';
import type { Action, AIProvider, Conversation, DataSource, Message } from '../models/types.js';

/**
 * In-memory DatasourceRepository implementation
 */
export class InMemoryDatasourceRepository implements DatasourceRepository {
  private store = new Map<number, DataSource>();
  private currentId = 1;

  async list(): Promise<DataSource[]> {
    return Array.from(this.store.values()).sort((a, b) => {
      // Sort by createdAt descending (newest first)
      if (a.createdAt && b.createdAt) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }
      // Fallback to id if createdAt is missing
      return b.id - a.id;
    });
  }

  async create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource> {
    const exists = Array.from(this.store.values()).some((item) => item.name === input.name);
    if (exists) throw new Error('Datasource name already exists');

    // If first datasource, set as default
    const isFirst = this.store.size === 0;

    // If setting as default, unset other defaults
    if (input.isDefault || isFirst) {
      for (const item of this.store.values()) {
        if (item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      }
    }

    const now = new Date();
    const record: DataSource = {
      id: this.currentId++,
      lastSyncAt: undefined,
      ...input,
      isDefault: isFirst || (input.isDefault ?? false),
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(record.id, record);
    return record;
  }

  async update(input: Partial<DataSource> & { id: number }): Promise<DataSource> {
    const existing = this.store.get(input.id);
    if (!existing) throw new Error('Datasource not found');

    // If setting as default, unset other defaults
    if (input.isDefault === true) {
      for (const item of this.store.values()) {
        if (item.id !== input.id && item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      }
    }

    const updated: DataSource = { ...existing, ...input, id: existing.id };
    this.store.set(updated.id, updated);
    return updated;
  }

  async remove(id: number): Promise<void> {
    if (!this.store.has(id)) throw new Error('Datasource not found');
    this.store.delete(id);
  }

  async setDefault(id: number): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new Error('Datasource not found');

    // Unset all defaults
    for (const item of this.store.values()) {
      if (item.isDefault) {
        this.store.set(item.id, { ...item, isDefault: false });
      }
    }

    // Set specified datasource as default
    this.store.set(id, { ...existing, isDefault: true });
  }
}

/**
 * In-memory ActionRepository implementation
 */
export class InMemoryActionRepository implements ActionRepository {
  private store = new Map<number, Action>();
  private currentId = 1;

  async list(): Promise<Action[]> {
    return Array.from(this.store.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async get(id: number): Promise<Action | null> {
    return this.store.get(id) ?? null;
  }

  async create(input: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action> {
    const record: Action = {
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    };
    this.store.set(record.id, record);
    return record;
  }

  async update(input: Partial<Action> & { id: number }): Promise<Action> {
    const existing = this.store.get(input.id);
    if (!existing) throw new Error('Action not found');
    const record: Action = { ...existing, ...input, updatedAt: new Date() };
    this.store.set(record.id, record);
    return record;
  }

  async remove(id: number): Promise<void> {
    if (!this.store.delete(id)) throw new Error('Action not found');
  }
}

/**
 * In-memory ConversationRepository implementation
 */
export class InMemoryConversationRepository implements ConversationRepository {
  private conversationsStore = new Map<number, Conversation>();
  private messagesStore = new Map<number, Message[]>();
  private conversationId = 1;
  private messageId = 1;

  async list(): Promise<Conversation[]> {
    return Array.from(this.conversationsStore.values());
  }

  async get(id: number): Promise<Conversation | null> {
    return this.conversationsStore.get(id) ?? null;
  }

  async create(input: { title?: string; userId?: number }): Promise<Conversation> {
    const now = new Date();
    const conv: Conversation = {
      id: this.conversationId++,
      title: input.title,
      userId: input.userId,
      createdAt: now,
      updatedAt: now,
    };
    this.conversationsStore.set(conv.id, conv);
    this.messagesStore.set(conv.id, []);
    return conv;
  }

  async appendMessage(input: {
    conversationId: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: unknown;
  }): Promise<Message> {
    const conv = this.conversationsStore.get(input.conversationId);
    if (!conv) throw new Error('Conversation not found');
    const msg: Message = {
      id: this.messageId++,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      metadata: input.metadata,
      createdAt: new Date(),
    };
    this.messagesStore.get(input.conversationId)?.push(msg);
    return msg;
  }

  async messages(id: number): Promise<Message[]> {
    return this.messagesStore.get(id) ?? [];
  }
}

/**
 * In-memory AIProviderRepository implementation
 */
export class InMemoryAIProviderRepository implements AIProviderRepository {
  private store = new Map<number, AIProvider>();
  private currentId = 1;

  async list(): Promise<AIProvider[]> {
    return Array.from(this.store.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async create(input: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider> {
    const exists = Array.from(this.store.values()).some((item) => item.name === input.name);
    if (exists) throw new Error('AI Provider name already exists');

    // If first provider, set as default
    const isFirst = this.store.size === 0;

    // If setting as default, unset other defaults
    if (input.isDefault || isFirst) {
      for (const item of this.store.values()) {
        if (item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      }
    }

    const record: AIProvider = {
      id: this.currentId++,
      name: input.name,
      type: input.type,
      apiKey: input.apiKey,
      baseURL: input.baseURL,
      defaultModel: input.defaultModel,
      isDefault: isFirst || (input.isDefault ?? false),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.set(record.id, record);
    return record;
  }

  async update(input: Partial<AIProvider> & { id: number }): Promise<AIProvider> {
    const existing = this.store.get(input.id);
    if (!existing) throw new Error('AI Provider not found');

    // If setting as default, unset other defaults
    if (input.isDefault === true) {
      for (const item of this.store.values()) {
        if (item.id !== input.id && item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      }
    }

    const updated: AIProvider = {
      ...existing,
      ...input,
      id: existing.id,
      updatedAt: new Date(),
    };
    this.store.set(updated.id, updated);
    return updated;
  }

  async remove(id: number): Promise<void> {
    if (!this.store.has(id)) throw new Error('AI Provider not found');
    this.store.delete(id);
  }

  async setDefault(id: number): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new Error('AI Provider not found');

    // Unset all defaults
    for (const item of this.store.values()) {
      if (item.isDefault) {
        this.store.set(item.id, { ...item, isDefault: false });
      }
    }

    // Set specified provider as default
    this.store.set(id, { ...existing, isDefault: true });
  }
}
