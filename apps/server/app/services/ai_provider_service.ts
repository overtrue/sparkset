import { testAIProviderConnection } from '../ai/index.js';
import type { AIProviderRepository } from '../db/interfaces.js';
import type { AIProvider } from '../models/types.js';
import { toId } from '../utils/validation.js';

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
 * AI Provider service that uses a repository for data access.
 * The repository must be provided - use InMemoryAIProviderRepository for testing
 * or LucidAIProviderRepository for production.
 */
export class AIProviderService {
  constructor(private repo: AIProviderRepository) {}

  async list(): Promise<AIProvider[]> {
    return this.repo.list();
  }

  async create(input: CreateAIProviderInput): Promise<AIProvider> {
    const normalizedInput = { ...input, isDefault: input.isDefault ?? false };
    // If first provider (list is empty), auto set as default
    const list = await this.repo.list();
    if (list.length === 0) {
      normalizedInput.isDefault = true;
    }
    return this.repo.create(normalizedInput);
  }

  async update(input: UpdateAIProviderInput): Promise<AIProvider> {
    const id = toId(input.id);
    if (!id) throw new Error('Invalid provider ID');
    return this.repo.update({ ...input, id });
  }

  async remove(id: number): Promise<void> {
    const validId = toId(id);
    if (!validId) throw new Error('Invalid provider ID');
    await this.repo.remove(validId);
  }

  async setDefault(id: number): Promise<void> {
    const validId = toId(id);
    if (!validId) throw new Error('Invalid provider ID');
    await this.repo.setDefault(validId);
  }

  /**
   * 测试 AI Provider 连通性
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
   */
  async testConnectionById(
    id: number,
  ): Promise<{ success: boolean; message: string; timestamp?: string }> {
    const validId = toId(id);
    if (!validId) {
      return {
        success: false,
        message: 'Invalid provider ID',
      };
    }

    const list = await this.repo.list();
    const provider = list.find((p) => p.id === validId);

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
