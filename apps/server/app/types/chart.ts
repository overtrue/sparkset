/**
 * BI 图表模块类型定义
 * 适配 shadcn/ui Chart 组件
 */

// 列类型（复用现有）
export type ColumnType = 'quantitative' | 'temporal' | 'nominal' | 'ordinal';

// Dataset Schema
export interface DatasetSchema {
  columns: { name: string; type: ColumnType }[];
  primaryTimeField?: string;
}

// shadcn ChartConfig 类型
export interface ShadcnChartConfig {
  [key: string]: {
    label: string;
    color?: string;
    theme?: { light: string; dark: string };
  };
}

// ChartSpec（适配 shadcn）
export interface ChartSpec {
  specVersion: '1.0';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';

  // 字段映射
  encoding: {
    x?: { field: string; type: ColumnType; label?: string };
    y?: {
      field: string;
      type: 'quantitative';
      agg: 'sum' | 'avg' | 'min' | 'max' | 'count';
      label?: string;
      color?: string;
    }[];
    series?: { field: string; type: ColumnType };
  };

  // Transform 链
  transform?: {
    op: 'filter' | 'timeBucket' | 'sort' | 'limit';
    [key: string]: unknown;
  }[];

  // shadcn 风格配置
  style?: {
    showLegend?: boolean;
    showTooltip?: boolean;
    showGrid?: boolean;
    stacked?: boolean;
    smooth?: boolean;
    aspectRatio?: number;
  };

  // Recharts 高级配置
  rechartsOverrides?: Record<string, unknown>;
}

// 前端渲染结果
export interface ChartRenderResult {
  chartType: ChartSpec['chartType'];
  data: unknown[];
  config: ShadcnChartConfig;
  rechartsProps: Record<string, unknown>;
  warnings?: string[];
}

// ResultSet
export interface ResultSet {
  schema: DatasetSchema;
  rows: Record<string, unknown>[];
  rowCount: number;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
