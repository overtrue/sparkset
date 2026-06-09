import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Bot from '../../../app/models/bot.js';
import type BotEvent from '../../../app/models/bot_event.js';
import type { QueryService } from '../../../app/services/query_service.js';

const userModelMock = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock('#models/user', () => ({
  default: userModelMock,
}));

import { BotQueryProcessor } from '../../../app/services/query_processor.js';

interface QueryServiceMock {
  run: ReturnType<typeof vi.fn>;
}

const bot = (input: Partial<Bot> = {}): Bot =>
  ({
    id: input.id ?? 1,
    enableQuery: input.enableQuery ?? true,
    enabledDataSources: input.enabledDataSources ?? [],
    defaultDataSourceId: input.defaultDataSourceId ?? null,
    aiProviderId: input.aiProviderId ?? null,
    creatorId: input.creatorId ?? 9,
  }) as Bot;

describe('BotQueryProcessor authorization', () => {
  let queryService: QueryServiceMock;
  let processor: BotQueryProcessor;

  beforeEach(() => {
    userModelMock.find.mockReset();
    queryService = {
      run: vi.fn().mockResolvedValue({
        sql: 'select 1',
        rows: [{ count: 1 }],
      }),
    };
    processor = new BotQueryProcessor(queryService as unknown as QueryService);
  });

  it('fails closed when query-enabled bot has no configured datasource', async () => {
    const result = await processor.processQuery(
      bot({ enabledDataSources: [], defaultDataSourceId: null }),
      {} as BotEvent,
      'show orders',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('DATASOURCE_NOT_CONFIGURED');
    expect(queryService.run).not.toHaveBeenCalled();
  });

  it('runs query with configured datasource and bot creator authorization context', async () => {
    userModelMock.find.mockResolvedValue({
      id: 9,
      roles: ['analyst'],
      permissions: [],
      isActive: true,
    });

    const result = await processor.processQuery(
      bot({
        enabledDataSources: [4],
        defaultDataSourceId: 3,
        aiProviderId: 2,
        creatorId: 9,
      }),
      {} as BotEvent,
      'show orders',
    );

    expect(result.success).toBe(true);
    expect(queryService.run).toHaveBeenCalledWith(
      {
        question: 'show orders',
        datasource: 3,
        aiProvider: 2,
        limit: 100,
      },
      {
        id: 9,
        roles: ['analyst'],
        permissions: [],
        isActive: true,
      },
    );
  });

  it('does not run query when bot creator is inactive or missing', async () => {
    userModelMock.find.mockResolvedValue({ id: 9, roles: [], permissions: [], isActive: false });

    const result = await processor.processQuery(
      bot({ enabledDataSources: [3], creatorId: 9 }),
      {} as BotEvent,
      'show orders',
    );

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('BOT_OWNER_UNAVAILABLE');
    expect(queryService.run).not.toHaveBeenCalled();
  });
});
