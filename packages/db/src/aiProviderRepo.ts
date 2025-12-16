import { PrismaClient } from '@prisma/client';
import { AIProvider } from '@sparkset/models';

export interface AIProviderRepository {
  list(): Promise<AIProvider[]>;
  create(input: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider>;
  update(input: Partial<AIProvider> & { id: number }): Promise<AIProvider>;
  remove(id: number): Promise<void>;
  setDefault(id: number): Promise<void>;
}

export class PrismaAIProviderRepository implements AIProviderRepository {
  constructor(private prisma: PrismaClient) {}

  async list(): Promise<AIProvider[]> {
    const rows = await this.prisma.aIProvider.findMany({
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    return rows.map(this.mapRow);
  }

  async create(input: Omit<AIProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIProvider> {
    // 如果设置为默认，先取消其他 provider 的默认状态
    if (input.isDefault) {
      await this.prisma.aIProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.aIProvider.create({
      data: {
        name: input.name,
        type: input.type,
        apiKey: input.apiKey ?? null,
        baseURL: input.baseURL ?? null,
        defaultModel: input.defaultModel ?? null,
        isDefault: input.isDefault ?? false,
      },
    });
    return this.mapRow(row);
  }

  async update(input: Partial<AIProvider> & { id: number }): Promise<AIProvider> {
    // 如果设置为默认，先取消其他 provider 的默认状态
    if (input.isDefault === true) {
      await this.prisma.aIProvider.updateMany({
        where: { isDefault: true, id: { not: input.id } },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.aIProvider.update({
      where: { id: input.id },
      data: {
        name: input.name,
        type: input.type,
        apiKey: input.apiKey,
        baseURL: input.baseURL,
        defaultModel: input.defaultModel,
        isDefault: input.isDefault,
      },
    });
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.aIProvider.delete({ where: { id } });
  }

  async setDefault(id: number): Promise<void> {
    // 先取消所有 provider 的默认状态
    await this.prisma.aIProvider.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    // 设置指定 provider 为默认
    await this.prisma.aIProvider.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  private mapRow = (row: {
    id: number;
    name: string;
    type: string;
    apiKey: string | null;
    baseURL: string | null;
    defaultModel: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AIProvider => ({
    id: row.id,
    name: row.name,
    type: row.type,
    apiKey: row.apiKey ?? undefined,
    baseURL: row.baseURL ?? undefined,
    defaultModel: row.defaultModel ?? undefined,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}
