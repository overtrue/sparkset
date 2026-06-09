import { describe, expect, it, vi } from 'vitest';
import { ActionExecutor, ActionRegistry, createSqlActionHandler } from '..';
import { QueryExecutor } from '../../query/executor';
import { SqlSnippet } from '../../query/types';

describe('ActionExecutor', () => {
  it('executes SQL action via executor', async () => {
    const executeMock = vi.fn().mockResolvedValue({ rows: [{ a: 1 }], sql: [], summary: 'ok' });
    const executor = { execute: executeMock } as unknown as QueryExecutor;
    const registry = new ActionRegistry();
    registry.register(createSqlActionHandler({ executor }));
    const runner = new ActionExecutor(registry);

    const res = await runner.run({
      id: 1,
      type: 'sql',
      payload: { sql: 'select 1', datasourceId: 1 },
    });

    expect(res.success).toBe(true);
    expect(executeMock).toHaveBeenCalledWith([{ sql: 'select 1', datasourceId: 1 } as SqlSnippet], {
      limit: undefined,
    });
  });

  it('fails SQL action when datasource is not explicitly bound', async () => {
    const executeMock = vi.fn();
    const executor = { execute: executeMock } as unknown as QueryExecutor;
    const registry = new ActionRegistry();
    registry.register(createSqlActionHandler({ executor, defaultDatasourceId: 1 }));
    const runner = new ActionExecutor(registry);

    const res = await runner.run({
      id: 1,
      type: 'sql',
      payload: { sql: 'select 1' },
    });

    expect(res.success).toBe(false);
    expect(res.error?.message).toBe('Datasource is required for SQL action');
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns error if handler missing', async () => {
    const registry = new ActionRegistry();
    const runner = new ActionExecutor(registry);
    const res = await runner.run({ id: 1, type: 'api', payload: {} });
    expect(res.success).toBe(false);
  });
});
