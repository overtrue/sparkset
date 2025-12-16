import { PrismaClient } from '@prisma/client';
import { DataSource } from '@sparkset/models';
import { DatasourceRepository } from './datasourceRepo';

export class PrismaDatasourceRepository implements DatasourceRepository {
  constructor(private prisma: PrismaClient) {}

  async list(): Promise<DataSource[]> {
    const rows = await this.prisma.dataSource.findMany({
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    return rows.map(this.mapRow);
  }

  async create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource> {
    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault) {
      await this.prisma.dataSource.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.dataSource.create({
      data: {
        name: input.name,
        type: input.type,
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        database: input.database,
        isDefault: input.isDefault ?? false,
      },
    });
    return this.mapRow(row);
  }

  async update(input: Partial<DataSource> & { id: number }): Promise<DataSource> {
    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault === true) {
      await this.prisma.dataSource.updateMany({
        where: { isDefault: true, id: { not: input.id } },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.dataSource.update({
      where: { id: input.id },
      data: {
        name: input.name,
        type: input.type,
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        database: input.database,
        isDefault: input.isDefault,
        lastSyncAt: input.lastSyncAt,
      },
    });
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.dataSource.delete({ where: { id } });
  }

  async setDefault(id: number): Promise<void> {
    // 先取消所有数据源的默认状态
    await this.prisma.dataSource.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    // 设置指定数据源为默认
    await this.prisma.dataSource.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  private mapRow = (row: {
    id: number;
    name: string;
    type: string;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    isDefault: boolean;
    lastSyncAt: Date | null;
  }): DataSource => ({
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    database: row.database,
    isDefault: row.isDefault,
    lastSyncAt: row.lastSyncAt ?? undefined,
  });
}
