import { DatasourceRepository } from '../db/interfaces';
import type { DataSource } from '../models/types';

export type CreateDataSourceInput = Omit<DataSource, 'id' | 'lastSyncAt'>;
export type UpdateDataSourceInput = Partial<DataSource> & { id: number };

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

  async get(id: number): Promise<DataSource | null> {
    if (this.repo) {
      const list = await this.repo.list();
      return list.find((item) => item.id === id) || null;
    }
    return this.store.get(id) || null;
  }

  async create(input: CreateDataSourceInput): Promise<DataSource> {
    if (this.repo) {
      // 如果是第一个数据源（列表为空），自动设置为默认
      const list = await this.repo.list();
      if (list.length === 0) {
        input.isDefault = true;
      }
      // 如果设置为默认，先取消其他数据源的默认状态
      if (input.isDefault) {
        const existingDefaults = list.filter((d) => d.isDefault);
        for (const ds of existingDefaults) {
          await this.repo.update({ ...ds, isDefault: false });
        }
      }
      return this.repo.create(input);
    }

    const exists = Array.from(this.store.values()).some((item) => item.name === input.name);
    if (exists) throw new Error('Datasource name already exists');

    // 如果是第一个数据源，自动设置为默认
    const isFirst = this.store.size === 0;
    const record: DataSource = {
      id: this.currentId++,
      lastSyncAt: undefined,
      ...input,
      isDefault: isFirst || (input.isDefault ?? false),
    };

    // 如果设置为默认，先取消其他数据源的默认状态
    if (record.isDefault) {
      Array.from(this.store.values()).forEach((item) => {
        if (item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      });
    }

    this.store.set(record.id, record);
    return record;
  }

  async update(input: UpdateDataSourceInput): Promise<DataSource> {
    if (this.repo) {
      // 如果设置为默认，先取消其他数据源的默认状态
      if (input.isDefault === true) {
        const list = await this.repo.list();
        const existingDefaults = list.filter((d) => d.isDefault && d.id !== input.id);
        for (const ds of existingDefaults) {
          await this.repo.update({ ...ds, isDefault: false });
        }
      }
      return this.repo.update(input);
    }

    const existing = this.store.get(input.id);
    if (!existing) throw new Error('Datasource not found');

    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault === true) {
      Array.from(this.store.values()).forEach((item) => {
        if (item.id !== input.id && item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      });
    }

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

  async setDefault(id: number) {
    if (this.repo) {
      await this.repo.setDefault(id);
      return;
    }

    const existing = this.store.get(id);
    if (!existing) throw new Error('Datasource not found');

    // 取消所有数据源的默认状态
    Array.from(this.store.values()).forEach((item) => {
      if (item.isDefault) {
        this.store.set(item.id, { ...item, isDefault: false });
      }
    });

    // 设置指定数据源为默认
    this.store.set(id, { ...existing, isDefault: true });
  }
}
