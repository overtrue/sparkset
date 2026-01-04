/**
 * BI Chart Module Frontend Type Definitions
 * Extended with new chart system types
 */

// Re-export types from chart components for convenience
export type {
  ChartCategory,
  ChartVariant,
  ChartStyleConfig,
  ChartSpec,
  ChartRenderResult,
} from '@/components/charts/types';

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
  chartType: 'area' | 'bar' | 'line' | 'pie' | 'radar' | 'radial' | 'table';
  specJson: import('@/components/charts/types').ChartSpec;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
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
