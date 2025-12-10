import { ColumnDefinition, DataSource, TableSchema } from '@sparkline/models';
import { DBClient, DataSourceConfig, SchemaCacheRepository } from '@sparkline/db';

export interface SchemaServiceDeps {
  schemaRepo: SchemaCacheRepository;
  getDBClient: (datasource: DataSource) => Promise<DBClient>;
}

export class SchemaService {
  constructor(private deps: SchemaServiceDeps) {}

  async list(datasourceId: number): Promise<TableSchema[]> {
    return this.deps.schemaRepo.listTables(datasourceId);
  }

  async sync(datasource: DataSource): Promise<Date> {
    const client = await this.deps.getDBClient(datasource);
    const sql = `
      SELECT
        TABLE_NAME   AS tableName,
        COLUMN_NAME  AS columnName,
        DATA_TYPE    AS dataType,
        COLUMN_COMMENT AS columnComment,
        ORDINAL_POSITION AS ordinalPosition
      FROM information_schema.columns
      WHERE table_schema = '${datasource.database}'
      ORDER BY TABLE_NAME, ORDINAL_POSITION;
    `;

    const config: DataSourceConfig = { ...datasource };
    const { rows } = await client.query<{
      tableName: string;
      columnName: string;
      dataType: string;
      columnComment: string | null;
      ordinalPosition: number;
    }>(config, sql);

    const grouped = new Map<string, { tableName: string; columns: ColumnDefinition[] }>();

    for (const row of rows) {
      const entry = grouped.get(row.tableName) ?? { tableName: row.tableName, columns: [] };
      entry.columns.push({
        name: row.columnName,
        type: row.dataType,
        comment: row.columnComment ?? undefined,
      });
      grouped.set(row.tableName, entry);
    }

    await this.deps.schemaRepo.replaceSchemas(datasource.id, Array.from(grouped.values()));
    const now = new Date();
    return now;
  }
}
