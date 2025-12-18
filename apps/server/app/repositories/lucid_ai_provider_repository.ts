import type { AIProviderRepository } from '../db/interfaces';
import AiProviderModel from '../models/ai_provider.js';
import type { AIProvider } from '../models/types';
import { getDb } from './get-db.js';

export class LucidAIProviderRepository implements AIProviderRepository {
  async list(): Promise<AIProvider[]> {
    const rows = await AiProviderModel.query().orderBy('isDefault', 'desc').orderBy('id', 'asc');
    return rows.map(this.mapRow);
  }

  async create(input: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider> {
    // 如果设置为默认，先取消其他 provider 的默认状态
    if (input.isDefault) {
      await AiProviderModel.query().where('isDefault', true).update({ isDefault: false });
    }

    const row = await AiProviderModel.create({
      name: input.name,
      type: input.type,
      apiKey: input.apiKey ?? null,
      baseURL: input.baseURL ?? null,
      defaultModel: input.defaultModel ?? null,
      isDefault: input.isDefault ?? false,
    });
    return this.mapRow(row);
  }

  async update(input: Partial<AIProvider> & { id: number }): Promise<AIProvider> {
    // 如果设置为默认，先取消其他 provider 的默认状态
    if (input.isDefault === true) {
      await AiProviderModel.query()
        .where('isDefault', true)
        .where('id', '!=', input.id)
        .update({ isDefault: false });
    }

    const row = await AiProviderModel.findOrFail(input.id);
    row.merge({
      name: input.name,
      type: input.type,
      apiKey: input.apiKey,
      baseURL: input.baseURL,
      defaultModel: input.defaultModel,
      isDefault: input.isDefault,
    });
    await row.save();
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    const row = await AiProviderModel.findOrFail(id);
    await row.delete();
  }

  async setDefault(id: number): Promise<void> {
    const db = await getDb();
    const trx = await db.transaction();
    try {
      // 先取消所有 provider 的默认状态
      await AiProviderModel.query({ client: trx })
        .where('isDefault', true)
        .update({ isDefault: false });
      // 设置指定 provider 为默认
      await AiProviderModel.query({ client: trx }).where('id', id).update({ isDefault: true });
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  private mapRow = (row: AiProviderModel): AIProvider => ({
    id: row.id,
    name: row.name,
    type: row.type,
    apiKey: row.apiKey ?? undefined,
    baseURL: row.baseURL ?? undefined,
    defaultModel: row.defaultModel ?? undefined,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toJSDate(),
    updatedAt: row.updatedAt.toJSDate(),
  });
}
