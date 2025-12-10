import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerRoutes } from '../src/start/routes';
import { DatasourceService } from '../src/app/services/datasourceService';
import { ActionService } from '../src/app/services/actionService';
import { ConversationService } from '../src/app/services/conversationService';
import { QueryService } from '../src/app/services/queryService';

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

// QueryService with no executor -> stub rows
const makeQueryService = (datasourceService: DatasourceService, actionService: ActionService) =>
  new QueryService({ datasourceService, actionService });

describe('POST /query', () => {
  it('returns stub rows and sql', async () => {
    const app = Fastify({ logger: false });
    const datasourceService = makeDatasourceService();
    const actionService = makeActionService();
    const conversationService = makeConversationService();
    const queryService = makeQueryService(datasourceService, actionService);

    registerRoutes(app, {
      datasourceService,
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
    expect(json.rows).toHaveLength(1);
    expect(json.sql).toContain('SELECT *');
  });
});
