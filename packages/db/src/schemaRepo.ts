import { ColumnDefinition, TableSchema } from '@sparkline/models';
import { MySQLRepo } from './repository';
import { PrismaClient } from '@prisma/client';

export interface SchemaCacheRepository {
  replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; columns: ColumnDefinition[] }[],
  ): Promise<void>;
  listTables(datasourceId: number): Promise<TableSchema[]>;
}

export class InMemorySchemaCacheRepository implements SchemaCacheRepository {
  private store = new Map<number, TableSchema[]>();
  private currentId = 1;

  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    const records = tables.map((table) => ({
      id: this.currentId++,
      datasourceId,
      tableName: table.tableName,
      columns: table.columns,
      updatedAt: new Date(),
    }));
    this.store.set(datasourceId, records);
  }

  async listTables(datasourceId: number): Promise<TableSchema[]> {
    return this.store.get(datasourceId) ?? [];
  }
}

export class PrismaSchemaCacheRepository implements SchemaCacheRepository {
  constructor(private prisma: PrismaClient) {}

  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.columnDefinition.deleteMany({
        where: { tableSchema: { datasourceId } },
      });
      await tx.tableSchema.deleteMany({ where: { datasourceId } });

      for (const table of tables) {
        await tx.tableSchema.create({
          data: {
            datasourceId,
            tableName: table.tableName,
            columns: {
              create: table.columns.map((col, idx) => ({
                name: col.name,
                dataType: col.type,
                columnComment: col.comment,
                ordinalPosition: idx + 1,
              })),
            },
          },
        });
      }
    });
  }

  async listTables(datasourceId: number): Promise<TableSchema[]> {
    const rows = await this.prisma.tableSchema.findMany({
      where: { datasourceId },
      include: { columns: { orderBy: { ordinalPosition: 'asc' } } },
      orderBy: { tableName: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      datasourceId: row.datasourceId,
      tableName: row.tableName,
      updatedAt: row.updatedAt,
      columns: row.columns.map((c) => ({
        name: c.name,
        type: c.dataType,
        comment: c.columnComment ?? undefined,
      })),
    }));
  }
}

export class MySQLSchemaCacheRepository implements SchemaCacheRepository {
  constructor(private repo: MySQLRepo) {}

  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    await this.repo.query(
      'DELETE FROM column_definitions WHERE table_schema_id IN (SELECT id FROM table_schemas WHERE datasource_id = ?)',
      [datasourceId],
    );
    await this.repo.query('DELETE FROM table_schemas WHERE datasource_id = ?', [datasourceId]);

    for (const table of tables) {
      const result = await this.repo.query<{ insertId: number }>(
        'INSERT INTO table_schemas (datasource_id, table_name, updated_at) VALUES (?, ?, NOW())',
        [datasourceId, table.tableName],
      );
      const tableSchemaId = (result as unknown as { insertId: number }).insertId;
      for (const [idx, col] of table.columns.entries()) {
        await this.repo.query(
          'INSERT INTO column_definitions (table_schema_id, ordinal_position, name, data_type, column_comment) VALUES (?, ?, ?, ?, ?)',
          [tableSchemaId, idx + 1, col.name, col.type, col.comment ?? null],
        );
      }
    }
  }

  async listTables(datasourceId: number): Promise<TableSchema[]> {
    const tables = await this.repo.query<{
      id: number;
      table_name: string;
      updated_at: Date;
    }>(
      'SELECT id, table_name, updated_at FROM table_schemas WHERE datasource_id = ? ORDER BY table_name',
      [datasourceId],
    );
    const columns = await this.repo.query<{
      table_schema_id: number;
      name: string;
      data_type: string;
      column_comment: string | null;
      ordinal_position: number;
    }>(
      'SELECT table_schema_id, name, data_type, column_comment, ordinal_position FROM column_definitions WHERE table_schema_id IN (SELECT id FROM table_schemas WHERE datasource_id = ?) ORDER BY ordinal_position',
      [datasourceId],
    );
    const grouped = new Map<number, ColumnDefinition[]>();
    for (const col of columns) {
      if (!grouped.has(col.table_schema_id)) grouped.set(col.table_schema_id, []);
      grouped.get(col.table_schema_id)!.push({
        name: col.name,
        type: col.data_type,
        comment: col.column_comment ?? undefined,
      });
    }
    return tables.map((t) => ({
      id: t.id,
      datasourceId,
      tableName: t.table_name,
      updatedAt: t.updated_at,
      columns: grouped.get(t.id) ?? [],
    }));
  }
}
