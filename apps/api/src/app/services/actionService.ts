import { Action } from '@sparkline/models';
import { ActionRepository, PrismaActionRepository } from '@sparkline/db';
import { PrismaClient } from '@prisma/client';

export type CreateActionInput = Omit<Action, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateActionInput = Partial<CreateActionInput> & { id: number };

export class ActionService {
  private memoryStore = new Map<number, Action>();
  private currentId = 1;
  private repo?: ActionRepository;

  constructor(repo?: ActionRepository) {
    this.repo = repo;
  }

  static fromPrismaClient(prisma: PrismaClient) {
    return new ActionService(new PrismaActionRepository(prisma));
  }

  async list() {
    if (this.repo) return this.repo.list();
    return Array.from(this.memoryStore.values());
  }

  async get(id: number) {
    if (this.repo) return this.repo.get(id);
    return this.memoryStore.get(id) ?? null;
  }

  async create(input: CreateActionInput) {
    if (this.repo) return this.repo.create(input);
    const record: Action = {
      id: this.currentId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    };
    this.memoryStore.set(record.id, record);
    return record;
  }

  async update(input: UpdateActionInput) {
    if (this.repo) return this.repo.update(input);
    const existing = this.memoryStore.get(input.id);
    if (!existing) throw new Error('Action not found');
    const record: Action = { ...existing, ...input, updatedAt: new Date() };
    this.memoryStore.set(record.id, record);
    return record;
  }

  async remove(id: number) {
    if (this.repo) {
      await this.repo.remove(id);
      return;
    }
    if (!this.memoryStore.delete(id)) throw new Error('Action not found');
  }
}
