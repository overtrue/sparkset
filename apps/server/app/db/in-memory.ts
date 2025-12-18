import {
  ColumnDefinition,
  DBClient,
  DataSourceConfig,
  QueryResult,
  TableSchema,
} from '@sparkset/core';
import type { SchemaCacheRepository } from './interfaces';

/**
 * In-memory DBClient implementation for testing and fallback scenarios
 */
export class InMemoryDBClient implements DBClient {
  async testConnection(): Promise<boolean> {
    return true;
  }

  async query<T>(_config: DataSourceConfig, sql: string): Promise<QueryResult<T>> {
    void _config;
    void sql;
    return { rows: [] };
  }
}

/**
 * In-memory SchemaCacheRepository implementation for testing
 */
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
        const column = table.columns.find((c) => c.id === columnId);
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
