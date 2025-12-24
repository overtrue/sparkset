import { QueryExecutor, QueryPlanner } from '@sparkset/core';
import { describe, expect, it, vi } from 'vitest';
import { QueryService } from '../app/services/query_service';

const makeDatasourceService = () => ({
  list: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'ds',
      type: 'mysql',
      host: '',
      port: 0,
      username: '',
      password: '',
      database: '',
    },
  ]),
});
const makeActionService = () => ({ get: vi.fn().mockResolvedValue(null) });
const makeSchemaService = () => ({
  list: vi.fn().mockResolvedValue([
    {
      tableName: 'test_table',
      columns: [{ name: 'id', type: 'int' }],
    },
  ]),
});
const makeAIProviderService = () => ({
  list: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'test-provider',
      type: 'openai',
      apiKey: 'test-key',
      defaultModel: 'gpt-4o-mini',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
});

const planner = {
  plan: vi.fn().mockResolvedValue({
    question: 'q',
    sql: [{ sql: 'select 1', datasourceId: 1 }],
    limit: undefined,
  }),
} as unknown as QueryPlanner;
const executor = {
  execute: vi
    .fn()
    .mockResolvedValue({ rows: [{ a: 1 }], sql: [{ sql: 'select 1', datasourceId: 1 }] }),
} as unknown as QueryExecutor;

describe('QueryService', () => {
  it('returns executor rows when wired', async () => {
    const svc = new QueryService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      datasourceService: makeDatasourceService() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionService: makeActionService() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schemaService: makeSchemaService() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiProviderService: makeAIProviderService() as any,
      planner,
      executor,
    });

    const res = await svc.run({ question: 'hi' });
    expect(res.rows[0]).toEqual({ a: 1 });
  });

  it('returns empty rows when executor missing', async () => {
    const svc = new QueryService({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      datasourceService: makeDatasourceService() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionService: makeActionService() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schemaService: makeSchemaService() as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aiProviderService: makeAIProviderService() as any,
      planner,
    });

    const res = await svc.run({ question: 'hi', limit: 1 });
    expect(res.rows).toHaveLength(0);
    expect(res.summary).toContain('查询执行器未配置');
  });
});
