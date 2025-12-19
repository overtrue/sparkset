/**
 * BI 图表模块前端类型定义
 * 复制自后端，用于前端类型安全
 */

export interface Dataset {
  id: number;
  datasourceId: number;
  name: string;
  description?: string;
  querySql: string;
  schemaJson: Array<{ name: string; type: string }>;
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
    y?: Array<{
      field: string;
      type: 'quantitative';
      agg: 'sum' | 'avg' | 'min' | 'max' | 'count';
      label?: string;
      color?: string;
    }>;
    series?: { field: string; type: string };
  };
  transform?: Array<{ op: string; [key: string]: unknown }>;
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
  config: ChartConfig;
  rechartsProps: Record<string, unknown>;
  warnings?: string[];
}

export interface ChartConfig {
  [key: string]: {
    label: string;
    color?: string;
    theme?: { light: string; dark: string };
  };
}

export interface ResultSet {
  schema: {
    columns: Array<{ name: string; type: string }>;
  };
  rows: Record<string, unknown>[];
  rowCount: number;
}
