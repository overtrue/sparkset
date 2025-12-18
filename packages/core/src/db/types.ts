/**
 * Database client types for query execution
 * These types define the interface for executing queries against external data sources
 */

export interface DataSourceConfig {
  id: number;
  name: string;
  type: 'mysql' | 'postgres' | string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface QueryResult<T = unknown> {
  rows: T[];
}

export interface DBClient {
  testConnection: (config: DataSourceConfig) => Promise<boolean>;
  query: <T>(config: DataSourceConfig, sql: string) => Promise<QueryResult<T>>;
}

/**
 * Schema types for query planning and SQL generation
 * These types are shared across core, ai, and server packages
 */
export interface ColumnDefinition {
  id?: number;
  name: string;
  type: string;
  comment?: string;
  semanticDescription?: string;
}

export interface TableSchema {
  id: number;
  datasourceId: number;
  tableName: string;
  tableComment?: string;
  semanticDescription?: string;
  columns: ColumnDefinition[];
  updatedAt: Date;
}
