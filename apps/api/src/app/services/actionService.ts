import { Action } from '@sparkline/models';

export type CreateActionInput = Omit<Action, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateActionInput = Partial<CreateActionInput> & { id: number };

export class ActionService {
  private store = new Map<number, Action>();
  private currentId = 1;

  list() {
    return Array.from(this.store.values());
  }

  get(id: number) {
    return this.store.get(id);
  }

  create(input: CreateActionInput): Action {
    const record: Action = {
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    };
    this.store.set(record.id, record);
    return record;
  }

  update(input: UpdateActionInput): Action {
    const existing = this.store.get(input.id);
    if (!existing) throw new Error('Action not found');
    const record: Action = { ...existing, ...input, id: existing.id, updatedAt: new Date() };
    this.store.set(record.id, record);
    return record;
  }

  remove(id: number) {
    if (!this.store.delete(id)) {
      throw new Error('Action not found');
    }
  }
}
