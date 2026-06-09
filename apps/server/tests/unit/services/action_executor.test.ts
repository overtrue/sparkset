import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionExecutor } from '@sparkset/core';
import type Bot from '../../../app/models/bot.js';
import type BotEvent from '../../../app/models/bot_event.js';
import type { Action } from '../../../app/models/types.js';
import type { ActionService } from '../../../app/services/action_service.js';
import type { AuthorizationService } from '../../../app/services/authorization_service.js';
import type { DatasetService } from '../../../app/services/dataset_service.js';

const userModelMock = vi.hoisted(() => ({
  find: vi.fn(),
}));

vi.mock('#models/user', () => ({
  default: userModelMock,
}));

import { BotActionExecutor } from '../../../app/services/action_executor.js';

interface ActionServiceMock {
  get: ReturnType<typeof vi.fn>;
}

interface CoreActionExecutorMock {
  run: ReturnType<typeof vi.fn>;
}

interface AuthorizationServiceMock {
  can: ReturnType<typeof vi.fn>;
  canPerformGlobalAction: ReturnType<typeof vi.fn>;
}

const bot = (input: Partial<Bot> = {}): Bot =>
  ({
    id: input.id ?? 1,
    enabledActions: input.enabledActions ?? [10],
    creatorId: input.creatorId ?? 9,
  }) as Bot;

const sqlAction = (input: Partial<Action> = {}): Action => ({
  id: input.id ?? 10,
  name: input.name ?? 'Delete order',
  type: input.type ?? 'sql',
  payload: input.payload ?? {
    sql: 'delete from orders where id = :id',
    datasourceId: 3,
  },
  parameters: input.parameters,
  inputSchema: input.inputSchema,
  createdAt: input.createdAt ?? new Date(),
  updatedAt: input.updatedAt ?? new Date(),
});

const apiAction = (input: Partial<Action> = {}): Action =>
  sqlAction({
    id: input.id ?? 11,
    name: input.name ?? 'Notify webhook',
    type: input.type ?? 'api',
    payload: input.payload ?? {
      url: 'https://example.com/hooks/notify',
    },
    ...input,
  });

describe('BotActionExecutor authorization', () => {
  let actionService: ActionServiceMock;
  let coreExecutor: CoreActionExecutorMock;
  let authorization: AuthorizationServiceMock;
  let executor: BotActionExecutor;

  beforeEach(() => {
    userModelMock.find.mockReset();
    actionService = {
      get: vi.fn(),
    };
    coreExecutor = {
      run: vi.fn().mockResolvedValue({ success: true, data: { ok: true } }),
    };
    authorization = {
      can: vi.fn().mockResolvedValue(true),
      canPerformGlobalAction: vi.fn().mockReturnValue(true),
    };
    executor = new BotActionExecutor(
      actionService as unknown as ActionService,
      {} as DatasetService,
      coreExecutor as unknown as ActionExecutor,
      authorization as unknown as AuthorizationService,
    );
  });

  it('does not execute a SQL action when the bot creator lacks datasource manage access', async () => {
    userModelMock.find.mockResolvedValue({
      id: 9,
      roles: ['analyst'],
      permissions: [],
      isActive: true,
    });
    authorization.can.mockResolvedValue(false);

    const result = await executor.execute(bot(), {} as BotEvent, sqlAction());

    expect(authorization.can).toHaveBeenCalledWith(
      {
        id: 9,
        roles: ['analyst'],
        permissions: [],
        isActive: true,
      },
      'datasource:manage',
      { type: 'datasource', id: 3 },
    );
    expect(coreExecutor.run).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ACTION_NOT_AUTHORIZED');
  });

  it('executes a SQL action when the bot creator still has datasource manage access', async () => {
    userModelMock.find.mockResolvedValue({
      id: 9,
      roles: ['admin'],
      permissions: [],
      isActive: true,
    });

    const result = await executor.execute(bot(), {} as BotEvent, sqlAction());

    expect(result.success).toBe(true);
    expect(coreExecutor.run).toHaveBeenCalledWith({
      id: 10,
      type: 'sql',
      payload: {
        sql: 'delete from orders where id = :id',
        datasourceId: 3,
      },
      parameters: undefined,
    });
  });

  it('fails closed when the bot creator is inactive or missing', async () => {
    userModelMock.find.mockResolvedValue({
      id: 9,
      roles: [],
      permissions: [],
      isActive: false,
    });

    const result = await executor.execute(bot(), {} as BotEvent, sqlAction());

    expect(coreExecutor.run).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('BOT_OWNER_UNAVAILABLE');
  });

  it('requires action:execute before executing non-SQL actions', async () => {
    userModelMock.find.mockResolvedValue({
      id: 9,
      roles: [],
      permissions: [],
      isActive: true,
    });
    authorization.canPerformGlobalAction.mockReturnValue(false);

    const result = await executor.execute(
      bot({ enabledActions: [11] }),
      {} as BotEvent,
      apiAction(),
    );

    expect(authorization.canPerformGlobalAction).toHaveBeenCalledWith(
      {
        id: 9,
        roles: [],
        permissions: [],
        isActive: true,
      },
      'action:execute',
    );
    expect(coreExecutor.run).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ACTION_NOT_AUTHORIZED');
  });

  it('only lists enabled actions that the bot creator may execute now', async () => {
    userModelMock.find.mockResolvedValue({
      id: 9,
      roles: [],
      permissions: [],
      isActive: true,
    });
    authorization.can.mockImplementation((_user, _action, resource) => resource.id === 3);
    actionService.get
      .mockResolvedValueOnce(sqlAction({ id: 10, payload: { sql: 'select 1', datasourceId: 3 } }))
      .mockResolvedValueOnce(sqlAction({ id: 12, payload: { sql: 'select 1', datasourceId: 4 } }));

    const actions = await executor.listEnabledActions(bot({ enabledActions: [10, 12] }));

    expect(actions.map((action) => action.id)).toEqual([10]);
  });
});
