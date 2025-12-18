import { ColumnDefinition, TableSchema } from '@sparkset/core';
import type { SchemaCacheRepository } from '../db/interfaces';
import ColumnDefinitionModel from '../models/column_definition.js';
import TableSchemaModel from '../models/table_schema.js';
import { getDb } from './get-db.js';

export class LucidSchemaCacheRepository implements SchemaCacheRepository {
  async replaceSchemas(
    datasourceId: number,
    tables: { tableName: string; tableComment?: string; columns: ColumnDefinition[] }[],
  ): Promise<void> {
    const db = await getDb();
    const trx = await db.transaction();
    try {
      // 先获取现有的表，保留 semanticDescription
      const existingTables = await TableSchemaModel.query({ client: trx })
        .where('datasourceId', datasourceId)
        .preload('columns');
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

      // 删除现有的列和表
      await ColumnDefinitionModel.query({ client: trx })
        .whereIn(
          'tableSchemaId',
          existingTables.map((t) => t.id),
        )
        .delete();
      await TableSchemaModel.query({ client: trx }).where('datasourceId', datasourceId).delete();

      // 创建新表
      for (const table of tables) {
        const existingTable = existingTables.find((t) => t.tableName === table.tableName);
        const tableSchema = await TableSchemaModel.create(
          {
            datasourceId,
            tableName: table.tableName,
            tableComment: table.tableComment ?? null,
            semanticDescription: existingTable
              ? (existingSemanticDescriptions.get(existingTable.id) ?? null)
              : null,
          },
          { client: trx },
        );

        // 创建列
        for (const [idx, col] of table.columns.entries()) {
          const existingCol = existingTable?.columns.find((c) => c.name === col.name);
          await ColumnDefinitionModel.create(
            {
              tableSchemaId: tableSchema.id,
              ordinalPosition: idx + 1,
              name: col.name,
              dataType: col.type,
              columnComment: col.comment ?? null,
              semanticDescription: existingCol
                ? (existingColumnSemanticDescriptions.get(existingCol.id) ?? null)
                : null,
            },
            { client: trx },
          );
        }
      }

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async listTables(datasourceId: number): Promise<TableSchema[]> {
    const rows = await TableSchemaModel.query()
      .where('datasourceId', datasourceId)
      .preload('columns', (query) => {
        query.orderBy('ordinalPosition', 'asc');
      })
      .orderBy('tableName', 'asc');

    return rows.map((row) => ({
      id: row.id,
      datasourceId: row.datasourceId,
      tableName: row.tableName,
      tableComment: row.tableComment ?? undefined,
      semanticDescription: row.semanticDescription ?? undefined,
      updatedAt: row.updatedAt.toJSDate(),
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
    const table = await TableSchemaModel.findOrFail(tableSchemaId);
    if (data.tableComment !== undefined) {
      table.tableComment = data.tableComment;
    }
    if (data.semanticDescription !== undefined) {
      table.semanticDescription = data.semanticDescription;
    }
    await table.save();
  }

  async updateColumnMetadata(
    columnId: number,
    data: { columnComment?: string | null; semanticDescription?: string | null },
  ): Promise<void> {
    const column = await ColumnDefinitionModel.findOrFail(columnId);
    if (data.columnComment !== undefined) {
      column.columnComment = data.columnComment;
    }
    if (data.semanticDescription !== undefined) {
      column.semanticDescription = data.semanticDescription;
    }
    await column.save();
  }
}
