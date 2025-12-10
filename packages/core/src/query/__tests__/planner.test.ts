import { describe, it, expect } from 'vitest';
import { QueryPlanner } from '../planner';

describe('QueryPlanner', () => {
  it('uses provided datasource and limit', async () => {
    const planner = new QueryPlanner();
    const plan = await planner.plan('test question', 1, 2);
    expect(plan.sql[0].sql).toContain('LIMIT 2');
    expect(plan.sql[0].datasourceId).toBe(1);
  });

  it('throws when no datasource', async () => {
    const planner = new QueryPlanner();
    await expect(planner.plan('q')).rejects.toThrow('No datasource available');
  });
});
