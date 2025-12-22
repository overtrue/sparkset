export interface Dashboard {
  id: number;
  title: string;
  description: string | null;
  ownerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export type WidgetType = 'chart' | 'dataset' | 'text';

export interface DashboardWidget {
  id: number;
  dashboardId: number;
  title: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChartWidgetConfig {
  chartId: number;
}

export interface DatasetWidgetConfig {
  datasetId: number;
  maxRows?: number;
}

export interface TextWidgetConfig {
  content: string;
}

// 用于 Grid Layout 的数据结构
export interface WidgetLayout {
  i: string; // widget id
  x: number;
  y: number;
  w: number;
  h: number;
}
