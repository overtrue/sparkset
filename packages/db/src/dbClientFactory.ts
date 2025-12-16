import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import { DataSourceConfig, DBClient, QueryResult } from './index';

class MySQLDBClient implements DBClient {
  async testConnection(config: DataSourceConfig): Promise<boolean> {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    });
    await conn.end();
    return true;
  }

  async query<T = unknown>(config: DataSourceConfig, sql: string): Promise<QueryResult<T>> {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    });
    const [rows] = await conn.query(sql);
    await conn.end();
    return { rows: rows as T[] };
  }
}

class PrismaDBClient implements DBClient {
  private mysqlClient = new MySQLDBClient();

  async testConnection(config: DataSourceConfig): Promise<boolean> {
    // 使用 MySQL 客户端测试目标数据源的连接
    return this.mysqlClient.testConnection(config);
  }

  async query<T = unknown>(config: DataSourceConfig, sql: string): Promise<QueryResult<T>> {
    // 使用 MySQL 客户端连接到目标数据源执行查询
    // 不能使用 Prisma 默认连接，因为它指向 sparkset 应用数据库，而不是用户配置的数据源
    return this.mysqlClient.query<T>(config, sql);
  }
}

export const createDBClient = (config: DataSourceConfig, prisma?: PrismaClient): DBClient => {
  if (prisma) return new PrismaDBClient(prisma);
  if (config.type === 'mysql') return new MySQLDBClient();
  // default: mysql client
  return new MySQLDBClient();
};
