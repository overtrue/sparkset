/**
 * Schema types used for SQL generation prompts
 * These types match the TableSchema and ColumnDefinition from @sparkset/core
 * but are defined here to avoid circular dependencies
 */

export interface ColumnDefinition {
  id?: number;
  name: string;
  type: string;
  comment?: string;
  semanticDescription?: string;
}

export interface TableSchema {
  id: number;
  datasourceId: number;
  tableName: string;
  tableComment?: string;
  semanticDescription?: string;
  columns: ColumnDefinition[];
  updatedAt: Date;
}
