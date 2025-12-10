import { PrismaClient } from '@prisma/client';
import { Action } from '@sparkline/models';

export interface ActionRepository {
  list(): Promise<Action[]>;
  get(id: number): Promise<Action | null>;
  create(input: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action>;
  update(input: Partial<Action> & { id: number }): Promise<Action>;
  remove(id: number): Promise<void>;
}

export class PrismaActionRepository implements ActionRepository {
  constructor(private prisma: PrismaClient) {}

  async list(): Promise<Action[]> {
    const rows = await this.prisma.action.findMany({ orderBy: { id: 'asc' } });
    return rows.map(this.mapRow);
  }

  async get(id: number): Promise<Action | null> {
    const row = await this.prisma.action.findUnique({ where: { id } });
    return row ? this.mapRow(row) : null;
  }

  async create(input: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>): Promise<Action> {
    const row = await this.prisma.action.create({
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        payload: input.payload as unknown as object,
        parameters: input.parameters as unknown as object,
      },
    });
    return this.mapRow(row);
  }

  async update(input: Partial<Action> & { id: number }): Promise<Action> {
    const row = await this.prisma.action.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
        payload: input.payload as unknown as object,
        parameters: input.parameters as unknown as object,
      },
    });
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.action.delete({ where: { id } });
  }

  private mapRow = (row: {
    id: number;
    name: string;
    description: string | null;
    type: string;
    payload: unknown;
    parameters: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): Action => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    payload: row.payload,
    parameters: row.parameters ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
