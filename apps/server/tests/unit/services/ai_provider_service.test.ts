import { describe, expect, it, beforeEach } from 'vitest';
import { AIProviderService } from '../../../app/services/ai_provider_service.js';
import { InMemoryAIProviderRepository } from '../../../app/db/in-memory-repositories.js';
import type { AIProvider } from '../../../app/models/types.js';

describe('AIProviderService', () => {
  let service: AIProviderService;
  let repository: InMemoryAIProviderRepository;

  const sampleProvider: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test Provider',
    type: 'openai',
    apiKey: 'test-api-key',
    baseURL: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    isDefault: false,
  };

  beforeEach(() => {
    repository = new InMemoryAIProviderRepository();
    service = new AIProviderService(repository);
  });

  describe('create', () => {
    it('should create an AI provider', async () => {
      const result = await service.create(sampleProvider);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(sampleProvider.name);
      expect(result.type).toBe(sampleProvider.type);
      expect(result.apiKey).toBe(sampleProvider.apiKey);
      expect(result.createdAt).toBeDefined();
    });

    it('should auto-set first provider as default', async () => {
      const result = await service.create({ ...sampleProvider, isDefault: false });

      expect(result.isDefault).toBe(true);
    });

    it('should not auto-set subsequent providers as default', async () => {
      await service.create(sampleProvider);
      const second = await service.create({
        ...sampleProvider,
        name: 'Second Provider',
        isDefault: false,
      });

      expect(second.isDefault).toBe(false);
    });

    it('should reject duplicate names', async () => {
      await service.create(sampleProvider);

      await expect(service.create(sampleProvider)).rejects.toThrow(
        'AI Provider name already exists',
      );
    });
  });

  describe('list', () => {
    it('should return empty list initially', async () => {
      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should return created providers', async () => {
      await service.create(sampleProvider);
      await service.create({ ...sampleProvider, name: 'Another' });

      const result = await service.list();

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update provider fields', async () => {
      const created = await service.create(sampleProvider);

      const updated = await service.update({
        id: created.id,
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.type).toBe(sampleProvider.type);
    });

    it('should throw for invalid id', async () => {
      await expect(service.update({ id: NaN, name: 'Test' })).rejects.toThrow(
        'Invalid provider ID',
      );
    });
  });

  describe('remove', () => {
    it('should remove provider', async () => {
      const created = await service.create(sampleProvider);

      await service.remove(created.id);

      const result = await service.list();
      expect(result.find((p) => p.id === created.id)).toBeUndefined();
    });

    it('should throw for invalid id', async () => {
      await expect(service.remove(NaN)).rejects.toThrow('Invalid provider ID');
    });
  });

  describe('setDefault', () => {
    it('should set provider as default', async () => {
      const first = await service.create(sampleProvider);
      const second = await service.create({ ...sampleProvider, name: 'Second' });

      await service.setDefault(second.id);

      const list = await service.list();
      const updatedFirst = list.find((p) => p.id === first.id);
      const updatedSecond = list.find((p) => p.id === second.id);

      expect(updatedFirst!.isDefault).toBe(false);
      expect(updatedSecond!.isDefault).toBe(true);
    });

    it('should throw for invalid id', async () => {
      await expect(service.setDefault(NaN)).rejects.toThrow('Invalid provider ID');
    });
  });
});
