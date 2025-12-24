import type {
  ChartSpec,
  ResultSet,
  ShadcnChartConfig,
  ChartRenderResult,
  ValidationResult,
} from '../types/chart.js';

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
  validate(spec: ChartSpec, schema: { name: string; type: string }[]): ValidationResult {
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

      // 为每个唯一值生成配置
      const uniqueValues = Array.from(new Set((data as any[]).map((d) => d[xField])));
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
  private executeTransforms(data: unknown[], transforms?: ChartSpec['transform']): unknown[] {
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
    // 简单的 filter 实现
    const { field, eq, neq, gt, gte, lt, lte, in: inArr, between } = t;

    return data.filter((row) => {
      const value = row[field];

      if (eq !== undefined && value !== eq) return false;
      if (neq !== undefined && value === neq) return false;
      if (gt !== undefined && !(value > gt)) return false;
      if (gte !== undefined && !(value >= gte)) return false;
      if (lt !== undefined && !(value < lt)) return false;
      if (lte !== undefined && !(value <= lte)) return false;
      if (inArr !== undefined && !inArr.includes(value)) return false;
      if (between !== undefined && !(value >= between[0] && value <= between[1])) return false;

      return true;
    });
  }

  private applyTimeBucket(data: any[], t: any): any[] {
    // 简单的时间分桶实现
    const { field: _field, unit: _unit } = t; // unit: 'hour' | 'day' | 'week' | 'month'

    // 这里需要根据实际日期格式进行分桶
    // 暂返回原数据，实际实现需要 date-fns
    return data;
  }

  private applySort(data: any[], t: any): any[] {
    const { by } = t; // [{ field, dir: 'asc' | 'desc' }]

    return [...data].sort((a, b) => {
      for (const { field, dir } of by) {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal < bVal) return dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private groupAndAggregate(
    data: any[],
    groupByFields: string[],
    yFields: { field: string; agg: string }[],
  ): any[] {
    const groups = new Map<string, any[]>();

    // 分组
    data.forEach((row) => {
      const key = groupByFields.map((f) => row[f]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    });

    // 聚合
    const result: any[] = [];
    groups.forEach((rows, key) => {
      const groupKey = key.split('|');
      const newRow: any = {};

      // 设置分组字段
      groupByFields.forEach((field, index) => {
        newRow[field] = groupKey[index];
      });

      // 计算聚合指标
      yFields.forEach((y) => {
        const values = rows.map((r) => r[y.field]).filter((v) => v != null);
        let aggregated: number | null = null;

        switch (y.agg) {
          case 'sum':
            aggregated = values.reduce((sum, v) => sum + Number(v), 0);
            break;
          case 'avg':
            aggregated = values.reduce((sum, v) => sum + Number(v), 0) / values.length;
            break;
          case 'min':
            aggregated = Math.min(...values.map(Number));
            break;
          case 'max':
            aggregated = Math.max(...values.map(Number));
            break;
          case 'count':
            aggregated = values.length;
            break;
        }

        newRow[y.field] = aggregated;
      });

      result.push(newRow);
    });

    return result;
  }
}
