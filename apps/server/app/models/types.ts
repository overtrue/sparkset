/**
 * Domain model types for server application
 * These types define the data structures used in the server's business logic
 */

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
  isDefault?: boolean;
  lastSyncAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ActionType = 'sql' | 'api' | 'file' | string;

export interface ActionInputSchema {
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean';
    required?: boolean;
    default?: unknown;
    description?: string;
    label?: string;
  }[];
}

export interface Action {
  id: number;
  name: string;
  description?: string;
  type: ActionType;
  payload: unknown;
  parameters?: unknown;
  inputSchema?: ActionInputSchema;
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

export interface AIProvider {
  id: number;
  name: string;
  type: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
