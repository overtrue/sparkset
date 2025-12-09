// Shared data models used across apps.
export type DataSourceType = 'mysql' | 'postgres' | string;

export interface DataSource {
  id: number;
  name: string;
  type: DataSourceType;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  lastSyncAt?: Date;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  comment?: string;
}

export interface TableSchema {
  id: number;
  datasourceId: number;
  tableName: string;
  columns: ColumnDefinition[];
  updatedAt: Date;
}

export type ActionType = 'sql' | 'api' | 'file' | string;

export interface Action {
  id: number;
  name: string;
  description?: string;
  type: ActionType;
  payload: unknown;
  parameters?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: number;
  userId?: number;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: number;
  conversationId: number;
  role: Role;
  content: string;
  metadata?: unknown;
  createdAt: Date;
}
