import { Database } from '@adonisjs/lucid/database';
import type { DataSourceConfig, DBClient, QueryResult } from '@sparkset/core';

/**
 * Generate a unique connection name for a datasource
 */
function getConnectionName(config: DataSourceConfig): string {
  return `datasource_${config.id}_${config.host}_${config.port}_${config.database}`;
}

/**
 * Get the Lucid client type from datasource type
 */
function getClientType(type: string): 'mysql2' | 'pg' | 'better-sqlite3' {
  switch (type.toLowerCase()) {
    case 'mysql':
      return 'mysql2';
    case 'postgres':
    case 'postgresql':
      return 'pg';
    case 'sqlite':
      return 'better-sqlite3';
    default:
      return 'mysql2';
  }
}

/**
 * Lucid-based DBClient implementation
 * Uses Lucid Database class to create dynamic connections with connection pooling
 */
class LucidDBClient implements DBClient {
  constructor(
    private config: DataSourceConfig,
    private database: Database,
    private connectionName: string,
  ) {}

  async testConnection(_config: DataSourceConfig): Promise<boolean> {
    try {
      const connection = this.getConnection();
      // Try a simple query to test the connection
      await connection.rawQuery('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async query<T = unknown>(_config: DataSourceConfig, sql: string): Promise<QueryResult<T>> {
    const connection = this.getConnection();
    const result = await connection.rawQuery(sql);

    // Lucid rawQuery returns different formats depending on the driver
    // For mysql2, it returns [rows, fields]
    const rows = Array.isArray(result) && result[0] ? result[0] : result;

    return {
      rows: (Array.isArray(rows) ? rows : [rows]) as T[],
    };
  }

  private getConnection() {
    // Lazily register connection if it doesn't exist yet
    if (!this.database.manager.has(this.connectionName)) {
      const client = getClientType(this.config.type);
      const baseConfig = {
        debug: false,
        migrations: {
          naturalSort: true,
          paths: ['database/migrations'],
        },
      };

      if (client === 'mysql2') {
        this.database.manager.add(this.connectionName, {
          client: 'mysql2',
          connection: {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
          },
          ...baseConfig,
        });
      } else if (client === 'pg') {
        this.database.manager.add(this.connectionName, {
          client: 'pg',
          connection: {
            host: this.config.host,
            port: this.config.port,
            user: this.config.username,
            password: this.config.password,
            database: this.config.database,
          },
          ...baseConfig,
        });
      } else {
        this.database.manager.add(this.connectionName, {
          client: 'better-sqlite3',
          connection: {
            filename: this.config.database,
          },
          ...baseConfig,
        });
      }
    }

    // Database.connection will call manager.connect under the hood
    // and reuse the pool for the named connection.
    return this.database.connection(this.connectionName);
  }
}

/**
 * Create a factory function that returns DBClient instances using Lucid
 * This function caches connections by connection name to reuse connections
 */
export function createLucidDBClientFactory(database: Database) {
  // Cache of DBClient instances by connection name
  const clientCache = new Map<string, DBClient>();

  return (config: DataSourceConfig): DBClient => {
    const connectionName = getConnectionName(config);

    // Return cached client if exists
    if (clientCache.has(connectionName)) {
      return clientCache.get(connectionName)!;
    }

    // Create new client and cache it
    const client = new LucidDBClient(config, database, connectionName);
    clientCache.set(connectionName, client);
    return client;
  };
}
