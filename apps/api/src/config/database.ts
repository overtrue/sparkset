import { DataSourceConfig } from '@sparkset/db';
import { Env } from '../env';

export const buildDatasourceConfig = (env: Env): DataSourceConfig | null => {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_NAME) return null;
  return {
    id: 0,
    name: 'default',
    type: 'mysql',
    host: env.DB_HOST,
    port: env.DB_PORT ?? 3306,
    username: env.DB_USER,
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME,
  };
};
