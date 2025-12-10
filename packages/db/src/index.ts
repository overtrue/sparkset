// Database connector abstraction (placeholder).
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

export class InMemoryDBClient implements DBClient {
  async testConnection(): Promise<boolean> {
    return true;
  }

  async query<T>(_config: DataSourceConfig, sql: string): Promise<QueryResult<T>> {
    void _config;
    void sql;
    return { rows: [] };
  }
}

export * from './repository';
export * from './datasourceRepo';
