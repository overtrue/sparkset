import { QueryExecutor, QueryPlanner } from '@sparkset/core';
import { describe, expect, it, vi } from 'vitest';
import { QueryService } from '../app/services/query_service';
import { DatabaseException, ExternalServiceException } from '../app/exceptions/app_exceptions';
import type { AIProviderService } from '../app/services/ai_provider_service';
import type { DatasourceService } from '../app/services/datasource_service';
import type { SchemaService } from '../app/services/schema_service';

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
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor,
    });

    const res = await svc.run({ question: 'hi' });
    expect(res.rows[0]).toEqual({ a: 1 });
    expect(res.datasourceId).toBe(1);
    expect(res.aiProviderId).toBe(1);
    expect(res.limit).toBeUndefined();
  });

  it('passes limit to executor', async () => {
    const execute = vi
      .fn()
      .mockResolvedValue({ rows: [], sql: [{ sql: 'select 1', datasourceId: 1 }] });
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor: { execute } as unknown as QueryExecutor,
    });

    await svc.run({ question: 'hi', limit: 1 });
    expect(execute).toHaveBeenCalledWith(expect.anything(), { limit: 1 });
    const response = await svc.run({ question: 'hi', limit: 5 });
    expect(response.limit).toBe(5);
  });

  it('throws when no datasource configured', async () => {
    const svc = new QueryService({
      datasourceService: { list: vi.fn().mockResolvedValue([]) } as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toThrow('No datasource configured');
  });

  it('throws when selected datasource does not exist', async () => {
    const svc = new QueryService({
      datasourceService: {
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
      } as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor,
    });

    await expect(svc.run({ question: 'hi', datasource: 999 })).rejects.toThrow(
      'Selected datasource (ID: 999) not found',
    );
  });

  it('throws when selected ai provider does not exist', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: { list: vi.fn().mockResolvedValue([]) } as unknown as AIProviderService,
      planner,
      executor,
    });

    await expect(svc.run({ question: 'hi', aiProvider: 999 })).rejects.toThrow(
      'Selected AI provider (ID: 999) not found',
    );
  });

  it('maps planner schema sync missing error to configuration exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner: {
        plan: vi
          .fn()
          .mockRejectedValue(new Error('No tables found in datasource. Please sync first.')),
      } as unknown as QueryPlanner,
      executor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_CONFIGURATION_ERROR',
      status: 400,
    });
  });

  it('maps executor read-only errors to validation exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor: {
        execute: vi
          .fn()
          .mockRejectedValue(
            new Error('Only read-only queries are allowed. SQL: delete from users'),
          ),
      } as unknown as QueryExecutor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_VALIDATION_ERROR',
      status: 400,
    });
  });

  it('maps executor service errors to external service exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor: {
        execute: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED database host')),
      } as unknown as QueryExecutor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_EXTERNAL_SERVICE_ERROR',
      status: 502,
    });
  });

  it('maps unknown planner errors to external service exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner: {
        plan: vi.fn().mockRejectedValue(new Error('AI provider returned malformed response')),
      } as unknown as QueryPlanner,
      executor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_EXTERNAL_SERVICE_ERROR',
      status: 502,
    });
  });

  it('preserves query service exceptions when planner throws wrapped app exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner: {
        plan: vi.fn().mockRejectedValue(new DatabaseException('planner validation failed')),
      } as unknown as QueryPlanner,
      executor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_DATABASE_ERROR',
      status: 400,
    });
  });

  it('maps unknown executor errors to external service exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor: {
        execute: vi.fn().mockRejectedValue(new Error('unexpected executor crash')),
      } as unknown as QueryExecutor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toBeInstanceOf(ExternalServiceException);
  });

  it('maps executor database credential errors to database exception', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner,
      executor: {
        execute: vi
          .fn()
          .mockRejectedValue(
            new Error('Access denied for user. Please check database credentials.'),
          ),
      } as unknown as QueryExecutor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_DATABASE_ERROR',
      status: 400,
    });
  });

  it('extracts message from error objects for planner mapping', async () => {
    const svc = new QueryService({
      datasourceService: makeDatasourceService() as unknown as DatasourceService,
      schemaService: makeSchemaService() as unknown as SchemaService,
      aiProviderService: makeAIProviderService() as unknown as AIProviderService,
      planner: {
        plan: vi.fn().mockRejectedValue({
          message: 'No tables found in datasource. Please sync first.',
        }),
      } as unknown as QueryPlanner,
      executor,
    });

    await expect(svc.run({ question: 'hi' })).rejects.toMatchObject({
      code: 'E_CONFIGURATION_ERROR',
      status: 400,
    });
  });
});
