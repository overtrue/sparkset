import { PrismaClient } from '@prisma/client';
import { DataSource } from '@sparkline/models';
import { DatasourceRepository } from './datasourceRepo';

export class PrismaDatasourceRepository implements DatasourceRepository {
  constructor(private prisma: PrismaClient) {}

  async list(): Promise<DataSource[]> {
    const rows = await this.prisma.dataSource.findMany({
      orderBy: { id: 'asc' },
    });
    return rows.map(this.mapRow);
  }

  async create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource> {
    const row = await this.prisma.dataSource.create({
      data: {
        name: input.name,
        type: input.type,
        host: input.host,
        port: input.port,
        username: input.username,
        password: input.password,
        database: input.database,
      },
    });
    return this.mapRow(row);
  }

  async update(input: Partial<DataSource> & { id: number }): Promise<DataSource> {
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
        lastSyncAt: input.lastSyncAt,
      },
    });
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.dataSource.delete({ where: { id } });
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
    lastSyncAt: row.lastSyncAt ?? undefined,
  });
}
