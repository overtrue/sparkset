import { describe, expect, it, beforeEach } from 'vitest';
import { ActionService } from '../../../app/services/action_service.js';
import { InMemoryActionRepository } from '../../../app/db/in-memory-repositories.js';
import type { Action } from '../../../app/models/types.js';

describe('ActionService', () => {
  let service: ActionService;
  let repository: InMemoryActionRepository;

  const sampleAction: Omit<Action, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test Action',
    description: 'A test action',
    type: 'sql',
    payload: 'SELECT * FROM users',
    parameters: {},
    inputSchema: {
      parameters: [],
    },
  };

  beforeEach(() => {
    repository = new InMemoryActionRepository();
    service = new ActionService(repository);
  });

  describe('create', () => {
    it('should create an action', async () => {
      const result = await service.create(sampleAction);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(sampleAction.name);
      expect(result.type).toBe(sampleAction.type);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('list', () => {
    it('should return empty list initially', async () => {
      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should return created actions', async () => {
      await service.create(sampleAction);
      await service.create({ ...sampleAction, name: 'Another Action' });

      const result = await service.list();

      expect(result).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.get(999);

      expect(result).toBeNull();
    });

    it('should return action by id', async () => {
      const created = await service.create(sampleAction);

      const result = await service.get(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
      expect(result!.name).toBe(sampleAction.name);
    });
  });

  describe('update', () => {
    it('should update action fields', async () => {
      const created = await service.create(sampleAction);

      const updated = await service.update({
        id: created.id,
        name: 'Updated Action',
      });

      expect(updated.name).toBe('Updated Action');
      expect(updated.type).toBe(sampleAction.type);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should throw for non-existent id', async () => {
      await expect(service.update({ id: 999, name: 'Test' })).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove action', async () => {
      const created = await service.create(sampleAction);

      await service.remove(created.id);

      const result = await service.get(created.id);
      expect(result).toBeNull();
    });

    it('should throw for non-existent id', async () => {
      await expect(service.remove(999)).rejects.toThrow();
    });
  });
});
