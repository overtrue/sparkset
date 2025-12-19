# BI 图表模块开发计划

## 🎯 目标

实现基于数据集（Dataset）的图表系统，支持用户：

1. 定义可复用的数据集（基于现有数据源）
2. 基于数据集创建多种图表
3. 预览和保存图表配置
4. 在页面中渲染图表

## 📋 模块概览

### 核心概念

- **Dataset**：基于现有数据源的预定义查询 + Schema
- **Chart**：基于 Dataset 的可视化配置（ChartSpec）
- **Renderer**：将 ChartSpec + 数据转换为图表配置

### 技术栈

- **后端**：AdonisJS（复用现有架构）
- **数据库**：MySQL/PostgreSQL（复用现有迁移系统）
- **前端**：Next.js + Recharts（已有依赖）
- **UI 组件**：shadcn/ui Chart 组件（已存在 `components/ui/chart.tsx`）
- **状态管理**：React Hook Form + Zod（表单验证）

---

## 📊 Stage 1: 数据模型与迁移

### 1.1 创建数据库迁移

**文件**：`apps/server/database/migrations/1734000000008_create_datasets.ts`

```typescript
// datasets 表
- id (pk)
- datasource_id (fk -> datasources.id)
- name (string)
- description (text, nullable)
- query_sql (text) - SQL 查询定义
- schema_json (json) - ColumnDefinition[]
- schema_hash (string) - sha256
- owner_id (number)
- created_at, updated_at

// 索引
- (datasource_id)
- (owner_id)
```

**文件**：`apps/server/database/migrations/1734000000009_create_charts.ts`

```typescript
// charts 表
- id (pk)
- dataset_id (fk -> datasets.id)
- title (string)
- description (text, nullable)
- chart_type (enum: line|bar|area|pie|table)
- spec_json (json) - ChartSpec 配置
- owner_id (number)
- created_at, updated_at

// 索引
- (dataset_id)
- (owner_id)
```

### 1.2 创建数据模型

**文件**：`apps/server/app/models/dataset.ts`
**文件**：`apps/server/app/models/chart.ts`

### 1.3 创建类型定义

**文件**：`apps/server/app/types/chart.ts`

```typescript
// ColumnType（复用现有）
export type ColumnType = 'quantitative' | 'temporal' | 'nominal' | 'ordinal';

// DatasetSchema（复用现有）
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
    icon?: React.ComponentType;
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
      color?: string; // 指标颜色
    }[];
    series?: { field: string; type: ColumnType }; // 分组字段
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

// ResultSet（复用现有）
export interface ResultSet {
  schema: DatasetSchema;
  rows: Record<string, unknown>[];
  rowCount: number;
}
```

**验收标准**：

- ✅ 迁移文件创建成功
- ✅ 模型文件编译通过
- ✅ 类型定义完整

---

## 🛠️ Stage 2: 后端服务层

### 2.1 DatasetService

**文件**：`apps/server/app/services/dataset_service.ts`

```typescript
export class DatasetService {
  // 创建数据集
  async create(input: {
    datasourceId: number;
    name: string;
    description?: string;
    querySql: string;
    schemaJson: ColumnDefinition[];
  }): Promise<Dataset> {
    // 1. 计算 schemaHash
    // 2. 保存到数据库
  }

  // 执行数据集（预览）
  async execute(datasetId: number, params?: Record<string, unknown>): Promise<ResultSet> {
    // 1. 获取 dataset
    // 2. 获取 datasource 配置
    // 3. 使用 QueryExecutor 执行 SQL
    // 4. 返回标准化结果
  }

  // 获取数据集详情
  async get(id: number): Promise<Dataset & { datasource: DataSource }> {
    // 包含关联的 datasource 信息
  }
}
```

### 2.2 ChartService

**文件**：`apps/server/app/services/chart_service.ts`

```typescript
export class ChartService {
  // 创建图表
  async create(input: {
    datasetId: number;
    title: string;
    description?: string;
    chartType: ChartSpec['chartType'];
    spec: ChartSpec;
  }): Promise<Chart> {
    // 1. 验证 spec 与 dataset schema 兼容
    // 2. 保存到数据库
  }

  // 渲染图表（获取数据 + 生成配置）
  async render(
    chartId: number,
    options?: { useCache?: boolean },
  ): Promise<{
    chart: Chart;
    resultSet: ResultSet;
    chartOption: unknown; // Recharts 配置
    warnings?: string[];
  }> {
    // 1. 获取 chart + dataset
    // 2. 执行 dataset 获取数据
    // 3. 使用 ChartCompiler 生成配置
  }
}
```

### 2.3 ChartCompiler（适配 shadcn）

**文件**：`apps/server/app/services/chart_compiler.ts`

```typescript
import type { ChartSpec, ResultSet, ShadcnChartConfig, ChartRenderResult } from '../types/chart';

export class ChartCompiler {
  /**
   * 将 ChartSpec + ResultSet 编译为前端可用的配置
   * 输出格式完全适配 shadcn/ui Chart 组件
   */
  async compile(spec: ChartSpec, resultSet: ResultSet): Promise<ChartRenderResult> {
    // 1. 验证 spec 与 schema 兼容性
    const validation = this.validate(spec, resultSet.schema.columns);
    if (!validation.valid) {
      throw new Error(`ChartSpec validation failed: ${validation.errors.join(', ')}`);
    }

    // 2. 执行 transform 链
    const transformedData = this.executeTransforms(resultSet.rows, spec.transform);

    // 3. 执行聚合（如果需要）
    const aggregatedData = this.executeAggregation(transformedData, spec);

    // 4. 生成 shadcn ChartConfig
    const config = this.generateChartConfig(spec, aggregatedData);

    // 5. 生成 Recharts 组件 props
    const rechartsProps = this.generateRechartsProps(spec, aggregatedData);

    return {
      chartType: spec.chartType,
      data: aggregatedData,
      config,
      rechartsProps,
      warnings: validation.warnings,
    };
  }

  /**
   * 验证 ChartSpec
   */
  validate(
    spec: ChartSpec,
    schema: ColumnDefinition[],
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查 x 字段是否存在
    if (spec.encoding.x) {
      const xField = schema.find((c) => c.name === spec.encoding.x!.field);
      if (!xField) {
        errors.push(`X field "${spec.encoding.x.field}" not found in schema`);
      } else if (xField.type !== spec.encoding.x.type) {
        warnings.push(
          `X field type mismatch: expected ${spec.encoding.x.type}, got ${xField.type}`,
        );
      }
    }

    // 检查 y 字段
    if (!spec.encoding.y || spec.encoding.y.length === 0) {
      errors.push('At least one Y field is required');
    } else {
      spec.encoding.y.forEach((y) => {
        const yField = schema.find((c) => c.name === y.field);
        if (!yField) {
          errors.push(`Y field "${y.field}" not found in schema`);
        } else if (yField.type !== 'quantitative') {
          errors.push(`Y field "${y.field}" must be quantitative, got ${yField.type}`);
        }
      });
    }

    // 检查 chartType 约束
    if (spec.chartType === 'pie') {
      if (!spec.encoding.x) {
        errors.push('Pie chart requires X field (label)');
      }
      if (spec.encoding.y?.length !== 1) {
        errors.push('Pie chart requires exactly one Y field (value)');
      }
      if (spec.encoding.series) {
        errors.push('Pie chart does not support series');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 生成 shadcn ChartConfig
   */
  private generateChartConfig(spec: ChartSpec, data: unknown[]): ShadcnChartConfig {
    const config: ShadcnChartConfig = {};

    spec.encoding.y?.forEach((y, index) => {
      const key = y.field;
      config[key] = {
        label: y.label || y.field,
        color: y.color || this.getColorForIndex(index),
      };
    });

    // 如果是 pie chart，使用 x 字段作为 key
    if (spec.chartType === 'pie' && spec.encoding.x) {
      const xField = spec.encoding.x.field;
      const yField = spec.encoding.y![0].field;

      // 为每个唯一值生成配置
      const uniqueValues = Array.from(new Set(data.map((d: any) => d[xField])));
      uniqueValues.forEach((value, index) => {
        config[String(value)] = {
          label: String(value),
          color: this.getColorForIndex(index),
        };
      });
    }

    return config;
  }

  /**
   * 生成 Recharts props（适配 shadcn ChartContainer）
   */
  private generateRechartsProps(spec: ChartSpec, data: unknown[]): Record<string, unknown> {
    const baseProps = {
      data,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      showLegend: spec.style?.showLegend ?? true,
    };

    // X 轴配置
    const xAxisConfig = spec.encoding.x
      ? {
          dataKey: spec.encoding.x.field,
          tickLine: false,
          axisLine: false,
          tickMargin: 8,
          minTickGap: 32,
        }
      : {};

    // Y 轴配置
    const yAxisConfig = {
      hide: true,
    };

    // 根据 chartType 生成不同配置
    if (spec.chartType === 'line' || spec.chartType === 'area') {
      return {
        ...baseProps,
        xAxis: xAxisConfig,
        yAxis: yAxisConfig,
        lines: spec.encoding.y!.map((y) => ({
          type: spec.chartType === 'area' ? 'monotone' : 'linear',
          dataKey: y.field,
          stroke: `var(--color-${y.field})`,
          fill: spec.chartType === 'area' ? `var(--color-${y.field})` : undefined,
          fillOpacity: spec.chartType === 'area' ? 0.2 : 0,
          strokeWidth: 2,
          dot: false,
          activeDot: { r: 4 },
          isAnimationActive: true,
          ...(spec.style?.smooth && { type: 'monotone' }),
        })),
        ...spec.rechartsOverrides,
      };
    }

    if (spec.chartType === 'bar') {
      return {
        ...baseProps,
        xAxis: xAxisConfig,
        yAxis: yAxisConfig,
        bars: spec.encoding.y!.map((y) => ({
          dataKey: y.field,
          fill: `var(--color-${y.field})`,
          radius: [4, 4, 0, 0],
          isAnimationActive: true,
          stackId: spec.style?.stacked ? 'a' : undefined,
        })),
        ...spec.rechartsOverrides,
      };
    }

    if (spec.chartType === 'pie') {
      const xField = spec.encoding.x!.field;
      const yField = spec.encoding.y![0].field;

      return {
        ...baseProps,
        pieData: data,
        pieConfig: {
          nameKey: xField,
          dataKey: yField,
          innerRadius: 0,
          outerRadius: '80%',
          paddingAngle: 2,
          isAnimationActive: true,
        },
        ...spec.rechartsOverrides,
      };
    }

    if (spec.chartType === 'table') {
      return {
        ...baseProps,
        // 表格不需要 Recharts props
      };
    }

    return baseProps;
  }

  /**
   * 执行 transform 链
   */
  private executeTransforms(data: unknown[], transforms?: Transform[]): unknown[] {
    let result = [...(data as any[])];

    for (const t of transforms || []) {
      switch (t.op) {
        case 'filter':
          result = this.applyFilter(result, t);
          break;
        case 'timeBucket':
          result = this.applyTimeBucket(result, t);
          break;
        case 'sort':
          result = this.applySort(result, t);
          break;
        case 'limit':
          result = result.slice(0, (t as any).count);
          break;
      }
    }

    return result;
  }

  /**
   * 执行聚合
   */
  private executeAggregation(data: unknown[], spec: ChartSpec): unknown[] {
    const hasAgg = spec.encoding.y?.some((y) => y.agg);
    if (!hasAgg || !spec.encoding.x) return data;

    const groupByFields = [spec.encoding.x.field];
    if (spec.encoding.series) {
      groupByFields.push(spec.encoding.series.field);
    }

    return this.groupAndAggregate(data as any[], groupByFields, spec.encoding.y!);
  }

  // 辅助方法
  private getColorForIndex(index: number): string {
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    return colors[index % colors.length];
  }

  private applyFilter(data: any[], t: any): any[] {
    // 实现 filter 逻辑
    return data;
  }

  private applyTimeBucket(data: any[], t: any): any[] {
    // 实现 timeBucket 逻辑
    return data;
  }

  private applySort(data: any[], t: any): any[] {
    // 实现 sort 逻辑
    return data;
  }

  private groupAndAggregate(
    data: any[],
    groupByFields: string[],
    yFields: { field: string; agg: string }[],
  ): any[] {
    // 实现 groupBy + aggregate 逻辑
    // 返回格式：[{ xValue, series?, y0, y1, ... }]
    return data;
  }
}
```

### 2.4 控制器

**文件**：`apps/server/app/controllers/datasets_controller.ts`
**文件**：`apps/server/app/controllers/charts_controller.ts`

实现 RESTful API（见上文 API 设计）

**验收标准**：

- ✅ 所有服务方法单元测试通过
- ✅ 控制器 API 可调用
- ✅ 错误处理完整

---

## 🎨 Stage 3: 前端组件与页面

### 3.1 API 客户端

**文件**：`apps/dashboard/src/lib/api/datasets.ts`

```typescript
import type { Dataset, ResultSet } from '@/types/chart';

export interface CreateDatasetDto {
  datasourceId: number;
  name: string;
  description?: string;
  querySql: string;
  schemaJson: Array<{ name: string; type: string }>;
}

export const datasetsApi = {
  // 列表
  list: async (): Promise<{ items: Dataset[] }> => {
    const res = await fetch('/api/datasets');
    return res.json();
  },

  // 详情
  get: async (id: number): Promise<Dataset> => {
    const res = await fetch(`/api/datasets/${id}`);
    return res.json();
  },

  // 创建
  create: async (data: CreateDatasetDto): Promise<Dataset> => {
    const res = await fetch('/api/datasets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 更新
  update: async (id: number, data: Partial<CreateDatasetDto>): Promise<Dataset> => {
    const res = await fetch(`/api/datasets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 删除
  delete: async (id: number): Promise<void> => {
    await fetch(`/api/datasets/${id}`, { method: 'DELETE' });
  },

  // 预览执行
  preview: async (id: number, params?: Record<string, unknown>): Promise<ResultSet> => {
    const res = await fetch(`/api/datasets/${id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params }),
    });
    return res.json();
  },
};
```

**文件**：`apps/dashboard/src/lib/api/charts.ts`

```typescript
import type { Chart, ChartSpec, ChartRenderResult } from '@/types/chart';

export interface CreateChartDto {
  datasetId: number;
  title: string;
  description?: string;
  chartType: ChartSpec['chartType'];
  spec: ChartSpec;
}

export const chartsApi = {
  // 列表
  list: async (datasetId?: number): Promise<{ items: Chart[] }> => {
    const url = datasetId ? `/api/charts?datasetId=${datasetId}` : '/api/charts';
    const res = await fetch(url);
    return res.json();
  },

  // 详情
  get: async (id: number): Promise<Chart> => {
    const res = await fetch(`/api/charts/${id}`);
    return res.json();
  },

  // 创建
  create: async (data: CreateChartDto): Promise<Chart> => {
    const res = await fetch('/api/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 更新
  update: async (id: number, data: Partial<CreateChartDto>): Promise<Chart> => {
    const res = await fetch(`/api/charts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // 删除
  delete: async (id: number): Promise<void> => {
    await fetch(`/api/charts/${id}`, { method: 'DELETE' });
  },

  // 渲染（从保存的配置）
  render: async (id: number, useCache = true): Promise<ChartRenderResult> => {
    const url = `/api/charts/${id}/render?useCache=${useCache}`;
    const res = await fetch(url);
    return res.json();
  },

  // 预览（不保存）
  preview: async (data: {
    datasetRef: { datasetId: number };
    spec: ChartSpec;
  }): Promise<ChartRenderResult> => {
    const res = await fetch('/api/charts/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
};
```

**文件**：`apps/dashboard/src/types/chart.ts`（前端类型）

```typescript
// 复制自后端，用于前端类型安全
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
```

### 3.2 Dataset 管理页面

**文件**：`apps/dashboard/src/app/datasets/page.tsx` - 列表页
**文件**：`apps/dashboard/src/app/datasets/[id]/page.tsx` - 详情页（含预览）
**文件**：`apps/dashboard/src/components/datasets/form.tsx` - 创建/编辑表单
**文件**：`apps/dashboard/src/components/datasets/preview-table.tsx` - 数据预览表格

### 3.3 Chart 管理页面

**文件**：`apps/dashboard/src/app/charts/page.tsx` - 列表页
**文件**：`apps/dashboard/src/app/charts/new/page.tsx` - 创建页（Builder）
**文件**：`apps/dashboard/src/app/charts/[id]/page.tsx` - 详情页（渲染）
**文件**：`apps/dashboard/src/components/charts/builder.tsx` - 图表构建器
**文件**：`apps/dashboard/src/components/charts/renderer.tsx` - 图表渲染器（使用 Recharts）

### 3.4 Chart 构建器组件（使用 shadcn）

**文件**：`apps/dashboard/src/components/charts/builder.tsx`

**核心功能**：

- 使用 React Hook Form + Zod 验证
- 集成 shadcn UI 组件（Select, Input, Button, Card, Tabs）
- 数据集选择（动态加载 schema）
- 字段映射配置（根据 schema 动态生成）
- 图表类型选择（line/bar/area/pie/table）
- 实时预览（调用 `/api/charts/preview`）
- 保存图表（调用 `/api/charts`）

**UI 结构**：

```
┌─────────────────────────────────────────────┐
│ 图表配置 (左)          │ 预览 (右)           │
├────────────────────────┼─────────────────────┤
│ 数据集选择             │ ChartContainer      │
│ 标题输入               │   ├─ LineChart      │
│ 图表类型               │   ├─ BarChart       │
│ X 轴字段               │   ├─ PieChart       │
│ Y 轴指标（多选）       │   └─ DataTable      │
│ 聚合方式               │                     │
│ [预览] [保存]          │                     │
└────────────────────────┴─────────────────────┘
```

### 3.5 Chart 渲染器组件（适配 shadcn）

**文件**：`apps/dashboard/src/components/charts/renderer.tsx`

```typescript
'use client';

import * as React from 'react';
import {
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart';

interface ChartRendererProps {
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
  data: unknown[];
  config: ChartConfig;
  rechartsProps: Record<string, unknown>;
  className?: string;
}

export function ChartRenderer({ chartType, data, config, rechartsProps, className }: ChartRendererProps) {
  // 表格渲染
  if (chartType === 'table') {
    return <TableRenderer data={data} />;
  }

  // 图表渲染（使用 shadcn ChartContainer）
  return (
    <ChartContainer config={config} className={className}>
      {chartType === 'line' || chartType === 'area' ? (
        <LineChart {...rechartsProps}>
          <CartesianGrid vertical={false} />
          <XAxis {...rechartsProps.xAxis} />
          <YAxis {...rechartsProps.yAxis} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {rechartsProps.showLegend && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {rechartsProps.lines?.map((line: any, i: number) => (
            <Line key={i} {...line} />
          ))}
        </LineChart>
      ) : chartType === 'bar' ? (
        <BarChart {...rechartsProps}>
          <CartesianGrid vertical={false} />
          <XAxis {...rechartsProps.xAxis} />
          <YAxis {...rechartsProps.yAxis} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {rechartsProps.showLegend && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          {rechartsProps.bars?.map((bar: any, i: number) => (
            <Bar key={i} {...bar} />
          ))}
        </BarChart>
      ) : chartType === 'pie' ? (
        <PieChart {...rechartsProps}>
          <ChartTooltip content={<ChartTooltipContent />} />
          {rechartsProps.showLegend && (
            <ChartLegend content={<ChartLegendContent />} />
          )}
          <Pie
            data={rechartsProps.pieData}
            {...rechartsProps.pieConfig}
            label={({ name, value }) => `${name}: ${value}`}
          >
            {rechartsProps.pieData?.map((entry: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={config[entry.name]?.color || `hsl(var(--chart-${index % 5}))`}
              />
            ))}
          </Pie>
        </PieChart>
      ) : null}
    </ChartContainer>
  );
}

// 表格渲染器
function TableRenderer({ data }: { data: unknown[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        暂无数据
      </div>
    );
  }

  const rows = data as Record<string, unknown>[];
  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 text-left font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map((col) => (
                <td key={col} className="px-4 py-2">
                  {String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**验收标准**：

- ✅ Dataset 列表/创建/详情页面
- ✅ Chart 列表/创建/详情页面
- ✅ 图表构建器可配置字段
- ✅ 图表可正确渲染
- ✅ 响应式设计

---

## 🔍 Stage 4: 核心业务逻辑

### 4.1 Schema 校验与 Hash 计算

**文件**：`apps/server/app/services/schema_validator.ts`

```typescript
// 计算 schema hash（canonical JSON）
export function computeSchemaHash(schema: ColumnDefinition[]): string {
  const canonical = JSON.stringify(schema.sort((a, b) => a.name.localeCompare(b.name)));
  return 'sha256:' + createHash('sha256').update(canonical).digest('hex');
}

// 验证 ChartSpec 与 Schema 兼容性
export function validateSpecCompatibility(
  spec: ChartSpec,
  schema: ColumnDefinition[],
): { valid: boolean; errors: string[] } {
  // 实现验证逻辑
}
```

### 4.2 Transform 执行引擎

**文件**：`apps/server/app/services/transform_executor.ts`

```typescript
export class TransformExecutor {
  execute(resultSet: ResultSet, transforms: ChartSpec['transform']): ResultSet {
    let data = [...resultSet.rows];

    for (const t of transforms || []) {
      switch (t.op) {
        case 'filter':
          data = this.filter(data, t);
          break;
        case 'timeBucket':
          data = this.timeBucket(data, t);
          break;
        case 'aggregate':
          data = this.aggregate(data, t);
          break;
        case 'sort':
          data = this.sort(data, t);
          break;
        case 'limit':
          data = this.limit(data, t);
          break;
      }
    }

    return { ...resultSet, rows: data, rowCount: data.length };
  }

  // 各 transform 实现...
}
```

### 4.3 Recharts 配置生成器

**文件**：`apps/server/app/services/recharts_renderer.ts`

```typescript
export class RechartsRenderer {
  render(spec: ChartSpec, data: unknown[]): unknown {
    // 根据 chartType 生成对应配置
    switch (spec.chartType) {
      case 'line':
        return this.renderLine(spec, data);
      case 'bar':
        return this.renderBar(spec, data);
      // ...
    }
  }
}
```

**验收标准**：

- ✅ Schema hash 计算一致性测试
- ✅ Transform 执行正确性测试
- ✅ Recharts 配置生成测试

---

## 🧪 Stage 5: 测试与验证

### 5.1 后端测试

**文件**：`apps/server/tests/services/dataset_service.test.ts`
**文件**：`apps/server/tests/services/chart_compiler.test.ts`
**文件**：`apps/server/tests/services/transform_executor.test.ts`

**测试场景**：

- Dataset 创建与执行
- ChartSpec 验证（正确/错误情况）
- Transform 执行（filter/sort/aggregate/limit）
- Schema 变更检测
- 错误处理

### 5.2 前端测试

**文件**：`apps/dashboard/src/components/charts/builder.test.tsx`
**文件**：`apps/dashboard/src/components/charts/renderer.test.tsx`

**测试场景**：

- 表单验证
- 字段选择逻辑
- 预览更新
- 错误提示

### 5.3 集成测试

**文件**：`apps/server/tests/integration/charts.test.ts`

**测试流程**：

1. 创建数据源
2. 创建 Dataset（SQL 查询）
3. 执行 Dataset 预览
4. 创建 Chart（不同图表类型）
5. 预览 Chart
6. 保存 Chart
7. 渲染 Chart（从保存的 ID）
8. 修改 Dataset Schema
9. 验证 Chart 渲染时报错

### 5.4 E2E 测试（可选）

**文件**：`apps/dashboard/tests/charts.spec.ts`

使用 Playwright 或 Cypress 测试完整用户流程。

**验收标准**：

- ✅ 单元测试覆盖率 > 80%
- ✅ 集成测试覆盖核心流程
- ✅ 所有测试通过

---

## 🚀 Stage 6: MVP 验收与迭代

### 6.1 MVP 验收清单

| 功能         | 验收标准              | 状态 |
| ------------ | --------------------- | ---- |
| Dataset 管理 | 可创建/编辑/查看/列出 | ⬜   |
| Dataset 预览 | 执行 SQL 返回结果     | ⬜   |
| Chart 创建   | 可配置字段映射        | ⬜   |
| Chart 预览   | 实时显示图表          | ⬜   |
| Chart 保存   | 可保存到数据库        | ⬜   |
| Chart 渲染   | 从 ID 重新渲染        | ⬜   |
| Schema 校验  | 不一致时提示错误      | ⬜   |
| 错误处理     | 友好错误提示          | ⬜   |

### 6.2 迭代计划（MVP 后）

**Phase 2**：

- Dashboard 多图表布局
- 图表联动过滤（cross-filter）
- 计算字段支持

**Phase 3**：

- 更多图表类型（heatmap/scatter/boxplot）
- 数据集 join 支持
- 导出功能（PNG/CSV）

**Phase 4**：

- 权限系统（数据集/图表级别）
- 性能优化（缓存策略）
- 多引擎支持（ECharts/Plotly）

---

## 📁 文件结构

```
apps/server/
├── app/
│   ├── models/
│   │   ├── dataset.ts
│   │   └── chart.ts
│   ├── services/
│   │   ├── dataset_service.ts
│   │   ├── chart_service.ts
│   │   ├── chart_compiler.ts
│   │   ├── transform_executor.ts
│   │   └── recharts_renderer.ts
│   ├── controllers/
│   │   ├── datasets_controller.ts
│   │   └── charts_controller.ts
│   ├── validators/
│   │   ├── dataset.ts
│   │   └── chart.ts
│   └── types/
│       └── chart.ts
├── database/
│   └── migrations/
│       ├── 1734000000008_create_datasets.ts
│       └── 1734000000009_create_charts.ts
└── tests/
    ├── services/
    └── integration/

apps/dashboard/
├── src/
│   ├── app/
│   │   ├── datasets/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── charts/
│   │       ├── page.tsx
│   │       ├── new/
│   │       │   └── page.tsx
│   │       └── [id]/
│   │           └── page.tsx
│   ├── components/
│   │   ├── datasets/
│   │   │   ├── form.tsx
│   │   │   └── preview-table.tsx
│   │   └── charts/
│   │       ├── builder.tsx
│   │       ├── encoding-form.tsx
│   │       ├── transform-form.tsx
│   │       ├── preview-panel.tsx
│   │       └── renderer.tsx
│   └── lib/
│       └── api/
│           ├── datasets.ts
│           └── charts.ts
```

---

## ⏱️ 时间估算

| 阶段              | 工作日       | 说明                 |
| ----------------- | ------------ | -------------------- |
| Stage 1: 数据模型 | 1-2 天       | 迁移 + 模型 + 类型   |
| Stage 2: 后端服务 | 3-4 天       | 服务 + 控制器 + 验证 |
| Stage 3: 前端页面 | 4-5 天       | 页面 + 组件 + 表单   |
| Stage 4: 核心逻辑 | 2-3 天       | Transform + Renderer |
| Stage 5: 测试     | 2-3 天       | 单元 + 集成测试      |
| Stage 6: 调试优化 | 1-2 天       | Bug 修复 + 优化      |
| **总计**          | **13-19 天** | 约 2-4 周            |

---

## 🎯 关键决策点

### 1. **数据集执行策略**

- **MVP**：每次预览都执行 SQL（简单直接）
- **后期**：添加缓存层（DatasetRun）

### 2. **图表渲染库**

- **当前**：Recharts（已有依赖）
- **扩展**：可添加 ECharts 支持（按需）

### 3. **Schema 变更处理**

- **MVP**：渲染时检测，返回错误提示
- **后期**：自动迁移 + 通知机制

### 4. **权限控制**

- **MVP**：基于数据源权限（复用现有）
- **后期**：细粒度（数据集/图表级别）

---

## 📝 开发注意事项

### 遵循项目规范

1. ✅ 使用现有的代码风格（Prettier/ESLint）
2. ✅ 复用现有的组件（shadcn/ui）
3. ✅ 遵循 AdonisJS 6 的依赖注入模式
4. ✅ 使用 Zod 进行输入验证

### 测试驱动

1. ✅ 先写测试，再实现功能
2. ✅ 每个 commit 都通过测试
3. ✅ 不跳过任何测试

### 增量交付

1. ✅ 每个 Stage 都是可交付的
2. ✅ 每个 Stage 后进行 Code Review
3. ✅ 及时更新 IMPLEMENTATION_PLAN.md

### 错误处理

1. ✅ 所有 API 都有错误处理
2. ✅ 前端显示友好的错误信息
3. ✅ 记录关键操作的日志

---

## 🚨 风险与缓解

| 风险            | 影响 | 缓解措施                |
| --------------- | ---- | ----------------------- |
| Schema 变更频繁 | 高   | 添加版本管理 + 自动检测 |
| 大数据集性能    | 中   | 限制返回行数 + 分页     |
| 复杂 Transform  | 中   | MVP 只支持基础操作      |
| 与现有功能冲突  | 低   | 明确边界 + 充分测试     |

---

**状态**：待评审
**创建时间**：2025-12-19
**下一步**：Review → 开发 Stage 1
