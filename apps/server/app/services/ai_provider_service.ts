import { testAIProviderConnection } from '@sparkset/ai';
import { AIProviderRepository } from '../db/interfaces';
import type { AIProvider } from '../models/types';

export interface CreateAIProviderInput {
  name: string;
  type: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  isDefault?: boolean;
}

export interface UpdateAIProviderInput {
  id: number;
  name?: string;
  type?: string;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  isDefault?: boolean;
}

/**
 * AI Provider service that can use a repository or fall back to in-memory store.
 */
export class AIProviderService {
  private store = new Map<number, AIProvider>();
  private currentId = 1;

  constructor(private repo?: AIProviderRepository) {}

  async list() {
    if (this.repo) return this.repo.list();
    return Array.from(this.store.values());
  }

  async create(input: CreateAIProviderInput): Promise<AIProvider> {
    if (this.repo) {
      // 如果是第一个 provider（列表为空），自动设置为默认
      const list = await this.repo.list();
      if (list.length === 0) {
        input.isDefault = true;
      }
      // 如果设置为默认，先取消其他 provider 的默认状态
      if (input.isDefault) {
        const existingDefaults = list.filter((p) => p.isDefault);
        for (const provider of existingDefaults) {
          await this.repo.update({ ...provider, isDefault: false });
        }
      }
      return this.repo.create(input);
    }

    const exists = Array.from(this.store.values()).some((item) => item.name === input.name);
    if (exists) throw new Error('AI Provider name already exists');

    // 如果是第一个 provider，自动设置为默认
    const isFirst = this.store.size === 0;

    // 如果设置为默认，先取消其他 provider 的默认状态
    if (input.isDefault || isFirst) {
      Array.from(this.store.values()).forEach((item) => {
        if (item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      });
    }

    const record: AIProvider = {
      id: this.currentId++,
      name: input.name,
      type: input.type,
      apiKey: input.apiKey,
      baseURL: input.baseURL,
      defaultModel: input.defaultModel,
      isDefault: isFirst || (input.isDefault ?? false),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.set(record.id, record);
    return record;
  }

  async update(input: UpdateAIProviderInput): Promise<AIProvider> {
    if (this.repo) return this.repo.update(input);

    const existing = this.store.get(input.id);
    if (!existing) throw new Error('AI Provider not found');

    // 如果设置为默认，先取消其他 provider 的默认状态
    if (input.isDefault === true) {
      Array.from(this.store.values()).forEach((item) => {
        if (item.id !== input.id && item.isDefault) {
          this.store.set(item.id, { ...item, isDefault: false });
        }
      });
    }

    const updated: AIProvider = {
      ...existing,
      ...input,
      id: existing.id,
      updatedAt: new Date(),
    };
    this.store.set(updated.id, updated);
    return updated;
  }

  async remove(id: number) {
    if (this.repo) {
      await this.repo.remove(id);
      return;
    }
    if (!this.store.has(id)) throw new Error('AI Provider not found');
    this.store.delete(id);
  }

  async setDefault(id: number) {
    if (this.repo) {
      await this.repo.setDefault(id);
      return;
    }

    const existing = this.store.get(id);
    if (!existing) throw new Error('AI Provider not found');

    // 取消所有 provider 的默认状态
    Array.from(this.store.values()).forEach((item) => {
      if (item.isDefault) {
        this.store.set(item.id, { ...item, isDefault: false });
      }
    });

    // 设置指定 provider 为默认
    this.store.set(id, { ...existing, isDefault: true });
  }

  /**
   * 测试 AI Provider 连通性
   * @param config Provider 配置
   * @returns 测试结果
   */
  async testConnection(config: {
    type: string;
    apiKey?: string;
    baseURL?: string;
    defaultModel?: string;
  }): Promise<{ success: boolean; message: string; timestamp?: string }> {
    try {
      const result = await testAIProviderConnection({
        provider: config.type,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        model: config.defaultModel,
      });
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      };
    }
  }

  /**
   * 测试现有 Provider 的连通性
   * @param id Provider ID
   * @returns 测试结果
   */
  async testConnectionById(
    id: number,
  ): Promise<{ success: boolean; message: string; timestamp?: string }> {
    let provider: AIProvider | undefined;

    if (this.repo) {
      const list = await this.repo.list();
      provider = list.find((p) => p.id === id);
    } else {
      provider = this.store.get(id);
    }

    if (!provider) {
      return {
        success: false,
        message: 'Provider 未找到',
      };
    }

    return this.testConnection({
      type: provider.type,
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
      defaultModel: provider.defaultModel,
    });
  }
}
