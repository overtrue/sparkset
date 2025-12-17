import { PrismaClient } from '@prisma/client';
import { ColumnDefinition, TableSchema } from '@sparkset/models';
import { MySQLRepo } from './repository';

export interface SchemaCacheRepository {
  replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; tableComment?: string; columns: ColumnDefinition[] }[],
  ): Promise<void>;
  listTables(datasourceId: number): Promise<TableSchema[]>;
  updateTableMetadata(
    tableSchemaId: number,
    data: { tableComment?: string | null; semanticDescription?: string | null },
  ): Promise<void>;
  updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void>;
}

export class InMemorySchemaCacheRepository implements SchemaCacheRepository {
  private store = new Map<number, TableSchema[]>();
  private currentId = 1;

  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; tableComment?: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    const records = tables.map((table) => ({
      id: this.currentId++,
      datasourceId,
      tableName: table.tableName,
      tableComment: table.tableComment ?? undefined,
      semanticDescription: undefined,
      columns: table.columns,
      updatedAt: new Date(),
    }));
    this.store.set(datasourceId, records);
  }

  async listTables(datasourceId: number): Promise<TableSchema[]> {
    return this.store.get(datasourceId) ?? [];
  }

  async updateTableMetadata(
    tableSchemaId: number,
    data: { tableComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    for (const tables of this.store.values()) {
      const table = tables.find((t) => t.id === tableSchemaId);
      if (table) {
        if (data.tableComment !== undefined) table.tableComment = data.tableComment ?? undefined;
        if (data.semanticDescription !== undefined)
          table.semanticDescription = data.semanticDescription ?? undefined;
        return;
      }
    }
  }

  async updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    for (const tables of this.store.values()) {
      for (const table of tables) {
        const column = table.columns.find((c: any) => (c as any).id === columnId);
        if (column) {
          if (data.columnComment !== undefined) column.comment = data.columnComment ?? undefined;
          if (data.semanticDescription !== undefined)
            column.semanticDescription = data.semanticDescription ?? undefined;
          return;
        }
      }
    }
  }
}

export class PrismaSchemaCacheRepository implements SchemaCacheRepository {
  constructor(private prisma: PrismaClient) {}

  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; tableComment?: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 先获取现有的表，保留 semanticDescription
      const existingTables = await tx.tableSchema.findMany({
        where: { datasourceId },
        include: { columns: true },
      });
      const existingSemanticDescriptions = new Map<number, string | undefined>();
      const existingColumnSemanticDescriptions = new Map<number, string | undefined>();
      for (const table of existingTables) {
        if (table.semanticDescription) {
          existingSemanticDescriptions.set(table.id, table.semanticDescription);
        }
        for (const col of table.columns) {
          if (col.semanticDescription) {
            existingColumnSemanticDescriptions.set(col.id, col.semanticDescription);
          }
        }
      }

      await tx.columnDefinition.deleteMany({
        where: { tableSchema: { datasourceId } },
      });
      await tx.tableSchema.deleteMany({ where: { datasourceId } });

      for (const table of tables) {
        const existingTable = existingTables.find((t) => t.tableName === table.tableName);
        await tx.tableSchema.create({
          data: {
            datasourceId,
            tableName: table.tableName,
            tableComment: table.tableComment ?? undefined,
            semanticDescription: existingTable
              ? existingSemanticDescriptions.get(existingTable.id)
              : undefined,
            columns: {
              create: table.columns.map((col, idx) => {
                const existingCol = existingTable?.columns.find((c) => c.name === col.name);
                return {
                  name: col.name,
                  dataType: col.type,
                  columnComment: col.comment,
                  semanticDescription: existingCol
                    ? existingColumnSemanticDescriptions.get(existingCol.id)
                    : undefined,
                  ordinalPosition: idx + 1,
                };
              }),
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
      tableComment: row.tableComment ?? undefined,
      semanticDescription: row.semanticDescription ?? undefined,
      updatedAt: row.updatedAt,
      columns: row.columns.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.dataType,
        comment: c.columnComment ?? undefined,
        semanticDescription: c.semanticDescription ?? undefined,
      })),
    }));
  }

  async updateTableMetadata(
    tableSchemaId: number,
    data: { tableComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    await this.prisma.tableSchema.update({
      where: { id: tableSchemaId },
      data: {
        ...(data.tableComment !== undefined && { tableComment: data.tableComment }),
        ...(data.semanticDescription !== undefined && {
          semanticDescription: data.semanticDescription,
        }),
      },
    });
  }

  async updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    await this.prisma.columnDefinition.update({
      where: { id: columnId },
      data: {
        ...(data.columnComment !== undefined && { columnComment: data.columnComment }),
        ...(data.semanticDescription !== undefined && {
          semanticDescription: data.semanticDescription,
        }),
      },
    });
  }
}

export class MySQLSchemaCacheRepository implements SchemaCacheRepository {
  constructor(private repo: MySQLRepo) {}

  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; tableComment?: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    // 先获取现有的表，保留 semanticDescription
    const existingTables = await this.repo.query<{
      id: number;
      table_name: string;
    }>('SELECT id, table_name FROM table_schemas WHERE datasource_id = ?', [datasourceId]);
    const existingSemanticDescriptions = new Map<number, string | null>();
    const existingColumnSemanticDescriptions = new Map<number, string | null>();
    if (existingTables.length > 0) {
      const tableIds = existingTables.map((t) => t.id);
      const existingTableData = await this.repo.query<{
        id: number;
        semantic_description: string | null;
      }>('SELECT id, semantic_description FROM table_schemas WHERE id IN (?)', [tableIds]);
      for (const row of existingTableData) {
        existingSemanticDescriptions.set(row.id, row.semantic_description);
      }

      const existingColumns = await this.repo.query<{
        id: number;
        semantic_description: string | null;
      }>('SELECT id, semantic_description FROM column_definitions WHERE table_schema_id IN (?)', [
        tableIds,
      ]);
      for (const row of existingColumns) {
        existingColumnSemanticDescriptions.set(row.id, row.semantic_description);
      }
    }

    await this.repo.query(
      'DELETE FROM column_definitions WHERE table_schema_id IN (SELECT id FROM table_schemas WHERE datasource_id = ?)',
      [datasourceId],
    );
    await this.repo.query('DELETE FROM table_schemas WHERE datasource_id = ?', [datasourceId]);

    for (const table of tables) {
      const existingTable = existingTables.find((t) => t.table_name === table.tableName);
      const result = await this.repo.query<{ insertId: number }>(
        'INSERT INTO table_schemas (datasource_id, table_name, table_comment, semantic_description, updated_at) VALUES (?, ?, ?, ?, NOW())',
        [
          datasourceId,
          table.tableName,
          table.tableComment ?? null,
          existingTable ? (existingSemanticDescriptions.get(existingTable.id) ?? null) : null,
        ],
      );
      const tableSchemaId = (result as unknown as { insertId: number }).insertId;
      for (const [idx, col] of table.columns.entries()) {
        // 查找现有列的 semanticDescription
        let colSemanticDesc = null;
        if (existingTable) {
          const existingCols = await this.repo.query<{
            id: number;
            name: string;
            semantic_description: string | null;
          }>(
            'SELECT id, name, semantic_description FROM column_definitions WHERE table_schema_id = ? AND name = ?',
            [existingTable.id, col.name],
          );
          if (existingCols.length > 0) {
            colSemanticDesc = existingColumnSemanticDescriptions.get(existingCols[0].id) ?? null;
          }
        }
        await this.repo.query(
          'INSERT INTO column_definitions (table_schema_id, ordinal_position, name, data_type, column_comment, semantic_description) VALUES (?, ?, ?, ?, ?, ?)',
          [tableSchemaId, idx + 1, col.name, col.type, col.comment ?? null, colSemanticDesc],
        );
      }
    }
  }

  async listTables(datasourceId: number): Promise<TableSchema[]> {
    const tables = await this.repo.query<{
      id: number;
      table_name: string;
      table_comment: string | null;
      semantic_description: string | null;
      updated_at: Date;
    }>(
      'SELECT id, table_name, COALESCE(table_comment, NULL) as table_comment, COALESCE(semantic_description, NULL) as semantic_description, updated_at FROM table_schemas WHERE datasource_id = ? ORDER BY table_name',
      [datasourceId],
    );
    const columns = await this.repo.query<{
      id: number;
      table_schema_id: number;
      name: string;
      data_type: string;
      column_comment: string | null;
      semantic_description: string | null;
      ordinal_position: number;
    }>(
      'SELECT id, table_schema_id, name, data_type, column_comment, COALESCE(semantic_description, NULL) as semantic_description, ordinal_position FROM column_definitions WHERE table_schema_id IN (SELECT id FROM table_schemas WHERE datasource_id = ?) ORDER BY ordinal_position',
      [datasourceId],
    );
    const grouped = new Map<number, ColumnDefinition[]>();
    for (const col of columns) {
      if (!grouped.has(col.table_schema_id)) grouped.set(col.table_schema_id, []);
      grouped.get(col.table_schema_id)!.push({
        id: col.id,
        name: col.name,
        type: col.data_type,
        comment: col.column_comment ?? undefined,
        semanticDescription: col.semantic_description ?? undefined,
      });
    }
    return tables.map((t) => ({
      id: t.id,
      datasourceId,
      tableName: t.table_name,
      tableComment: t.table_comment ?? undefined,
      semanticDescription: t.semantic_description ?? undefined,
      updatedAt: t.updated_at,
      columns: grouped.get(t.id) ?? [],
    }));
  }

  async updateTableMetadata(
    tableSchemaId: number,
    data: { tableComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    if (data.tableComment !== undefined) {
      updates.push('table_comment = ?');
      values.push(data.tableComment);
    }
    if (data.semanticDescription !== undefined) {
      updates.push('semantic_description = ?');
      values.push(data.semanticDescription);
    }
    if (updates.length > 0) {
      values.push(tableSchemaId);
      await this.repo.query(`UPDATE table_schemas SET ${updates.join(', ')} WHERE id = ?`, values);
    }
  }

  async updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    if (data.columnComment !== undefined) {
      updates.push('column_comment = ?');
      values.push(data.columnComment);
    }
    if (data.semanticDescription !== undefined) {
      updates.push('semantic_description = ?');
      values.push(data.semanticDescription);
    }
    if (updates.length > 0) {
      values.push(columnId);
      await this.repo.query(
        `UPDATE column_definitions SET ${updates.join(', ')} WHERE id = ?`,
        values,
      );
    }
  }
}
