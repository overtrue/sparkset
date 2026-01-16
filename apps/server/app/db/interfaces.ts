import { ColumnDefinition, TableSchema } from '@sparkset/core';
import type { Action, AIProvider, Conversation, DataSource, Message } from '../models/types';

/**
 * Repository interface for Datasource data access
 */
export interface DatasourceRepository {
  list(): Promise<DataSource[]>;
  create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource>;
  update(input: Partial<DataSource> & { id: number }): Promise<DataSource>;
  remove(id: number): Promise<void>;
  setDefault(id: number): Promise<void>;
}

/**
 * Repository interface for Action data access
 */
export interface ActionRepository {
  list(): Promise<Action[]>;
  get(id: number): Promise<Action | null>;
  create(input: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action>;
  update(input: Partial<Action> & { id: number }): Promise<Action>;
  remove(id: number): Promise<void>;
}

/**
 * Repository interface for Conversation data access
 */
export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  get(id: number): Promise<Conversation | null>;
  create(input: { title?: string; userId?: number }): Promise<Conversation>;
  appendMessage(input: {
    conversationId: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: unknown;
  }): Promise<Message>;
  messages(id: number): Promise<Message[]>;
  /**
   * Find conversation by bot ID and external user ID
   * Used to maintain conversation continuity across sessions
   */
  findByBotAndExternalUser(botId: number, externalUserId: string): Promise<Conversation | null>;
  /**
   * Create a conversation with bot context
   */
  createWithBotContext(input: {
    title?: string;
    userId?: number;
    botId: number;
    externalUserId: string;
  }): Promise<Conversation>;
}

/**
 * Repository interface for AIProvider data access
 */
export interface AIProviderRepository {
  list(): Promise<AIProvider[]>;
  create(input: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider>;
  update(input: Partial<AIProvider> & { id: number }): Promise<AIProvider>;
  remove(id: number): Promise<void>;
  setDefault(id: number): Promise<void>;
}

/**
 * Repository interface for Schema cache data access
 */
export interface SchemaCacheRepository {
  replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; tableComment?: string; columns: ColumnDefinition[] }[],
  ): Promise<void>;
  listTables(datasourceId: number): Promise<TableSchema[]>;
  updateTableMetadata(
    tableSchemaId: number,
    data: { tableComment?: string | null; semanticDescription?: string | null },
  ): Promise<void>;
  updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void>;
}
