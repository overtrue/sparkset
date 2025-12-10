import { DatasourceRepository } from '@sparkline/db';
import { DataSource } from '@sparkline/models';

export type CreateDataSourceInput = Omit<DataSource, 'id' | 'lastSyncAt'>;
export type UpdateDataSourceInput = Partial<CreateDataSourceInput> & { id: number };

/**
 * Datasource service that can use a repository or fall back to in-memory store.
 */
export class DatasourceService {
  private store = new Map<number, DataSource>();
  private currentId = 1;

  constructor(private repo?: DatasourceRepository) {}

  async list() {
    if (this.repo) return this.repo.list();
    return Array.from(this.store.values());
  }

  async create(input: CreateDataSourceInput): Promise<DataSource> {
    if (this.repo) return this.repo.create(input);

    const exists = Array.from(this.store.values()).some((item) => item.name === input.name);
    if (exists) throw new Error('Datasource name already exists');

    const record: DataSource = { id: this.currentId++, lastSyncAt: undefined, ...input };
    this.store.set(record.id, record);
    return record;
  }

  async update(input: UpdateDataSourceInput): Promise<DataSource> {
    if (this.repo) return this.repo.update(input);

    const existing = this.store.get(input.id);
    if (!existing) throw new Error('Datasource not found');
    const updated: DataSource = { ...existing, ...input, id: existing.id };
    this.store.set(updated.id, updated);
    return updated;
  }

  async remove(id: number) {
    if (this.repo) {
      await this.repo.remove(id);
      return;
    }
    if (!this.store.has(id)) throw new Error('Datasource not found');
    this.store.delete(id);
  }

  async sync(id: number) {
    if (this.repo) {
      const list = await this.repo.list();
      const target = list.find((item) => item.id === id);
      if (!target) throw new Error('Datasource not found');
      const updated = await this.repo.update({ ...target, lastSyncAt: new Date() });
      return updated.lastSyncAt;
    }
    const existing = this.store.get(id);
    if (!existing) throw new Error('Datasource not found');
    const synced = { ...existing, lastSyncAt: new Date() };
    this.store.set(id, synced);
    return synced.lastSyncAt;
  }
}
