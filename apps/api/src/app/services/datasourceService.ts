import { DataSource } from '@sparkline/models';

export type CreateDataSourceInput = Omit<DataSource, 'id' | 'lastSyncAt'>;
export type UpdateDataSourceInput = Partial<CreateDataSourceInput> & { id: number };

/**
 * Simple in-memory datasource registry. Replace with real DB repository later.
 */
export class DatasourceService {
  private store = new Map<number, DataSource>();
  private currentId = 1;

  list() {
    return Array.from(this.store.values());
  }

  create(input: CreateDataSourceInput): DataSource {
    const exists = Array.from(this.store.values()).some((item) => item.name === input.name);
    if (exists) {
      throw new Error('Datasource name already exists');
    }
    const record: DataSource = {
      id: this.currentId++,
      lastSyncAt: undefined,
      ...input,
    };
    this.store.set(record.id, record);
    return record;
  }

  update(input: UpdateDataSourceInput): DataSource {
    const existing = this.store.get(input.id);
    if (!existing) {
      throw new Error('Datasource not found');
    }
    const updated: DataSource = { ...existing, ...input, id: existing.id };
    this.store.set(updated.id, updated);
    return updated;
  }

  remove(id: number) {
    if (!this.store.has(id)) {
      throw new Error('Datasource not found');
    }
    this.store.delete(id);
  }

  sync(id: number) {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error('Datasource not found');
    }
    const synced = { ...existing, lastSyncAt: new Date() };
    this.store.set(id, synced);
    return synced.lastSyncAt;
  }
}
