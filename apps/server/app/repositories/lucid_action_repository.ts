import type { ActionRepository } from '../db/interfaces';
import ActionModel from '../models/action.js';
import type { Action } from '../models/types';

export class LucidActionRepository implements ActionRepository {
  async list(): Promise<Action[]> {
    const rows = await ActionModel.query().orderBy('created_at', 'desc');
    return rows.map(this.mapRow);
  }

  async get(id: number): Promise<Action | null> {
    const row = await ActionModel.find(id);
    return row ? this.mapRow(row) : null;
  }

  async create(input: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action> {
    const row = await ActionModel.create({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      payload: input.payload,
      parameters: input.parameters ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: (input as any).inputSchema ?? null,
    });
    return this.mapRow(row);
  }

  async update(input: Partial<Action> & { id: number }): Promise<Action> {
    const row = await ActionModel.findOrFail(input.id);
    row.merge({
      name: input.name,
      description: input.description ?? null,
      type: input.type,
      payload: input.payload,
      parameters: input.parameters ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: (input as any).inputSchema ?? null,
    });
    await row.save();
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    const row = await ActionModel.findOrFail(id);
    await row.delete();
  }

  private mapRow = (row: ActionModel): Action => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    payload: row.payload,
    parameters: row.parameters ?? undefined,
    inputSchema:
      row.inputSchema && typeof row.inputSchema === 'object' && 'parameters' in row.inputSchema
        ? (row.inputSchema as Action['inputSchema'])
        : undefined,
    createdAt: row.createdAt.toJSDate(),
    updatedAt: row.updatedAt.toJSDate(),
  });
}
