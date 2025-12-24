import { defineConfig } from '@adonisjs/lucid';
import env from '#start/env';
import type { DataSourceConfig } from '@sparkset/core';

type Env = typeof env;

export const buildDatasourceConfig = (currentEnv: Env = env): DataSourceConfig | null => {
  const host = currentEnv.get('DB_HOST');
  const user = currentEnv.get('DB_USER');
  const database = currentEnv.get('DB_NAME');
  if (!host || !user || !database) return null;
  return {
    id: 0,
    name: 'default',
    type: 'mysql',
    host,
    port: currentEnv.get('DB_PORT') ?? 3306,
    username: user,
    password: currentEnv.get('DB_PASSWORD') ?? '',
    database,
  };
};

// Parse DATABASE_URL if provided, otherwise use individual env vars
function parseDatabaseUrl(currentEnv: Env) {
  const urlValue = currentEnv.get('DATABASE_URL');
  if (urlValue) {
    // Parse mysql://user:password@host:port/database
    const url = new URL(urlValue);
    return {
      host: url.hostname,
      port: parseInt(url.port || '3306', 10),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading /
    };
  }
  return {
    host: currentEnv.get('DB_HOST') || 'localhost',
    port: currentEnv.get('DB_PORT') || 3306,
    user: currentEnv.get('DB_USER') || 'root',
    password: currentEnv.get('DB_PASSWORD') || '',
    database: currentEnv.get('DB_NAME') || 'sparkset',
  };
}

const connectionConfig = parseDatabaseUrl(env);

const dbConfig = defineConfig({
  connection: 'mysql',
  connections: {
    mysql: {
      client: 'mysql2',
      connection: connectionConfig,
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: false,
    },
  },
});

export default dbConfig;
