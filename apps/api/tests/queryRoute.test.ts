import { InMemoryDBClient, InMemorySchemaCacheRepository } from '@sparkset/db';
import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { ActionService } from '../src/app/services/actionService';
import { AIProviderService } from '../src/app/services/aiProviderService';
import { ConversationService } from '../src/app/services/conversationService';
import { DatasourceService } from '../src/app/services/datasourceService';
import { QueryService } from '../src/app/services/queryService';
import { SchemaService } from '../src/app/services/schemaService';
import { registerRoutes } from '../src/start/routes';

const makeDatasourceService = () => {
  const svc = new DatasourceService();
  // seed in-memory datasource store
  // @ts-expect-error access private for test seeding
  svc['store'] = new Map([
    [
      1,
      {
        id: 1,
        name: 'ds',
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'demo',
        lastSyncAt: undefined,
      },
    ],
  ]);
  return svc;
};

const makeActionService = () => new ActionService();
const makeConversationService = () => new ConversationService();
const makeAIProviderService = () => {
  const svc = new AIProviderService();
  // seed in-memory AI provider store
  // @ts-expect-error access private for test seeding
  svc['store'] = new Map([
    [
      1,
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
    ],
  ]);
  return svc;
};
const makeSchemaService = () =>
  new SchemaService({
    schemaRepo: new InMemorySchemaCacheRepository(),
    getDBClient: async () => new InMemoryDBClient(),
  });

// QueryService with no executor -> empty rows
const makeQueryService = (
  datasourceService: DatasourceService,
  actionService: ActionService,
  schemaService: SchemaService,
  aiProviderService: AIProviderService,
) => new QueryService({ datasourceService, actionService, schemaService, aiProviderService });

describe('POST /query', () => {
  it('returns empty rows when executor missing', async () => {
    const app = Fastify({ logger: false });
    const datasourceService = makeDatasourceService();
    const actionService = makeActionService();
    const conversationService = makeConversationService();
    const schemaService = makeSchemaService();
    const aiProviderService = makeAIProviderService();
    const queryService = makeQueryService(
      datasourceService,
      actionService,
      schemaService,
      aiProviderService,
    );

    registerRoutes(app, {
      datasourceService,
      schemaService,
      aiProviderService,
      actionService,
      conversationService,
      queryService,
      queryExecutor: undefined,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/query',
      payload: { question: '查订单', datasource: 1, limit: 1 },
    });

    expect(response.statusCode).toBe(200);
    const json = response.json();
    expect(json.rows).toHaveLength(0);
    expect(json.summary).toContain('查询执行器未配置');
  });
});
