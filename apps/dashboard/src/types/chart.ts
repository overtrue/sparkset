/**
 * BI Chart Module Frontend Type Definitions
 * Copied from backend for frontend type safety
 */

export interface Dataset {
  id: number;
  datasourceId: number;
  datasourceName: string;
  name: string;
  description?: string;
  querySql: string;
  schemaJson: { name: string; type: string }[];
  schemaHash: string;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chart {
  id: number;
  datasetId: number;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
  specJson: ChartSpec;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChartSpec {
  specVersion: '1.0';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
  encoding: {
    x?: { field: string; type: string; label?: string };
    y?: {
      field: string;
      type: 'quantitative';
      agg: 'sum' | 'avg' | 'min' | 'max' | 'count';
      label?: string;
      color?: string;
    }[];
    series?: { field: string; type: string };
  };
  transform?: { op: string; [key: string]: unknown }[];
  style?: {
    showLegend?: boolean;
    showTooltip?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
    smooth?: boolean;
    aspectRatio?: number;
  };
  rechartsOverrides?: Record<string, unknown>;
}

export interface ChartRenderResult {
  chartType: ChartSpec['chartType'];
  data: unknown[];
  config: Record<string, { label: string; color?: string }>;
  rechartsProps: Record<string, unknown>;
  warnings?: string[];
}

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
    theme?: { light: string; dark: string };
  }
>;

export interface ResultSet {
  schema: {
    columns: { name: string; type: string }[];
  };
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface Datasource {
  id: number;
  name: string;
  type: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  isDefault: number;
  lastSyncAt: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
}
