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
export type ShadcnChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
    theme?: { light: string; dark: string };
  }
>;

// ChartSpec（适配 shadcn）
export interface ChartSpec {
  specVersion: '1.0';
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'radar' | 'radial' | 'table';
  variant?: string;

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
    horizontal?: boolean;
    gradient?: boolean;
    showDots?: boolean;
    curveType?: string;
    innerRadius?: number;
    outerRadius?: number;
  };
}

// 前端渲染结果
export interface ChartRenderResult {
  chartType: ChartSpec['chartType'];
  variant?: string;
  data: unknown[];
  config: ShadcnChartConfig;
  style?: ChartSpec['style'];
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
