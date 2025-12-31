import type { DatasourceRepository } from '../db/interfaces.js';
import type { DataSource } from '../models/types.js';

export type CreateDataSourceInput = Omit<DataSource, 'id' | 'lastSyncAt'>;
export type UpdateDataSourceInput = Partial<DataSource> & { id: number };

/**
 * Datasource service that uses a repository for data access.
 * The repository must be provided - use InMemoryDatasourceRepository for testing
 * or LucidDatasourceRepository for production.
 */
export class DatasourceService {
  constructor(private repo: DatasourceRepository) {}

  async list(): Promise<DataSource[]> {
    return this.repo.list();
  }

  async get(id: number): Promise<DataSource | null> {
    const list = await this.repo.list();
    return list.find((item) => item.id === id) || null;
  }

  async create(input: CreateDataSourceInput): Promise<DataSource> {
    // If first datasource (list is empty), auto set as default
    const list = await this.repo.list();
    const normalizedInput = { ...input };
    if (list.length === 0) {
      normalizedInput.isDefault = true;
    }
    return this.repo.create(normalizedInput);
  }

  async update(input: UpdateDataSourceInput): Promise<DataSource> {
    return this.repo.update(input);
  }

  async remove(id: number): Promise<void> {
    await this.repo.remove(id);
  }

  async sync(id: number): Promise<Date | undefined> {
    const list = await this.repo.list();
    const target = list.find((item) => item.id === id);
    if (!target) throw new Error('Datasource not found');
    const updated = await this.repo.update({ ...target, lastSyncAt: new Date() });
    return updated.lastSyncAt;
  }

  async setDefault(id: number): Promise<void> {
    await this.repo.setDefault(id);
  }
}
