import { DBClient, DataSourceConfig } from '@sparkset/core';
import { describe, expect, it } from 'vitest';
import { InMemorySchemaCacheRepository } from '../app/db/in-memory';
import type { DataSource } from '../app/models/types';
import { AIProviderService } from '../app/services/ai_provider_service';
import { SchemaService } from '../app/services/schema_service';

class MockDBClient implements DBClient {
  constructor(private rows: any[]) {}
  async testConnection(): Promise<boolean> {
    return true;
  }
  async query<T>(_config: DataSourceConfig, _sql: string) {
    return { rows: this.rows as T[] };
  }
}

describe('SchemaService', () => {
  const datasource: DataSource = {
    id: 1,
    name: 'ds',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'pwd',
    database: 'db',
  };

  it('syncs and lists table schemas', async () => {
    const rows = [
      {
        tableName: 'orders',
        columnName: 'id',
        dataType: 'int',
        columnComment: null,
        ordinalPosition: 1,
      },
      {
        tableName: 'orders',
        columnName: 'amount',
        dataType: 'decimal',
        columnComment: '金额',
        ordinalPosition: 2,
      },
    ];
    const schemaRepo = new InMemorySchemaCacheRepository();
    const service = new SchemaService({
      schemaRepo,
      getDBClient: async () => new MockDBClient(rows),
      aiProviderService: new AIProviderService(),
    });

    const ts = await service.sync(datasource);
    expect(ts).toBeInstanceOf(Date);

    const list = await service.list(datasource.id);
    expect(list).toHaveLength(1);
    expect(list[0].tableName).toBe('orders');
    expect(list[0].columns).toHaveLength(2);
    expect(list[0].columns[1]).toEqual({ name: 'amount', type: 'decimal', comment: '金额' });
  });
});
