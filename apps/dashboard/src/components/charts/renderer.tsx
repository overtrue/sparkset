'use client';

import type { ChartConfig } from '@/components/ui/chart';
import type { ChartCategory, ChartStyleConfig, ChartVariant } from './types';
import { getDefaultStyle } from './registry';
import {
  AreaChartRenderer,
  BarChartRenderer,
  LineChartRenderer,
  PieChartRenderer,
  RadarChartRenderer,
  RadialChartRenderer,
  TableRenderer,
} from './renderers';

// ============================================================================
// Types
// ============================================================================

export interface ChartRendererProps {
  /** Chart type category */
  chartType: ChartCategory;
  /** Optional chart variant for specific styling */
  variant?: ChartVariant;
  /** Chart data */
  data: unknown[];
  /** Chart configuration (colors, labels) */
  config: ChartConfig;
  /** Optional recharts props (legacy support) */
  rechartsProps?: Record<string, unknown>;
  /** Optional style configuration */
  style?: ChartStyleConfig;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Main Renderer Component
// ============================================================================

/**
 * Unified Chart Renderer
 * Renders different chart types based on the chartType prop
 */
export function ChartRenderer({
  chartType,
  variant,
  data,
  config,
  rechartsProps = {},
  style: styleProp,
  className,
}: ChartRendererProps) {
  const chartData = data as Record<string, unknown>[];

  // Get default style from variant if provided, merge with style prop
  const variantStyle = variant ? getDefaultStyle(variant) : {};
  const style: ChartStyleConfig = {
    ...variantStyle,
    ...styleProp,
    // Legacy support: extract style from rechartsProps
    ...(rechartsProps.showLegend !== undefined && {
      showLegend: rechartsProps.showLegend as boolean,
    }),
    ...(rechartsProps.showGrid !== undefined && { showGrid: rechartsProps.showGrid as boolean }),
    ...(rechartsProps.stacked !== undefined && { stacked: rechartsProps.stacked as boolean }),
  };

  // Handle empty data
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  // Extract keys based on chart type
  const dataKeys = Object.keys(chartData[0] || {});
  const configKeys = Object.keys(config);

  // For cartesian charts: first key is X, config keys are Y
  const xKey = dataKeys[0] || 'x';
  const yKeys = configKeys.length > 0 ? configKeys : dataKeys.slice(1);

  // For categorical charts: use pieConfig from rechartsProps if available
  const pieConfig = rechartsProps.pieConfig as { nameKey?: string; dataKey?: string } | undefined;
  const valueKey =
    pieConfig?.dataKey || dataKeys.find((k) => typeof chartData[0][k] === 'number') || 'value';
  const nameKey = pieConfig?.nameKey || dataKeys.find((k) => k !== valueKey) || 'name';

  // Render based on chart type
  switch (chartType) {
    case 'area':
      return (
        <AreaChartRenderer
          data={chartData}
          config={config}
          xKey={xKey}
          yKeys={yKeys}
          style={style}
          className={className}
        />
      );

    case 'bar':
      return (
        <BarChartRenderer
          data={chartData}
          config={config}
          xKey={xKey}
          yKeys={yKeys}
          style={style}
          className={className}
        />
      );

    case 'line':
      return (
        <LineChartRenderer
          data={chartData}
          config={config}
          xKey={xKey}
          yKeys={yKeys}
          style={style}
          className={className}
        />
      );

    case 'pie':
      return (
        <PieChartRenderer
          data={chartData}
          config={config}
          nameKey={nameKey}
          valueKey={valueKey}
          style={style}
          className={className}
        />
      );

    case 'radar':
      return (
        <RadarChartRenderer
          data={chartData}
          config={config}
          categoryKey={nameKey}
          valueKeys={yKeys}
          style={style}
          className={className}
        />
      );

    case 'radial':
      return (
        <RadialChartRenderer
          data={chartData}
          config={config}
          nameKey={nameKey}
          valueKey={valueKey}
          style={style}
          className={className}
        />
      );

    case 'table':
      return <TableRenderer data={chartData} className={className} />;

    default:
      return (
        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
          Unsupported chart type: {chartType}
        </div>
      );
  }
}

// ============================================================================
// Legacy Export (for backward compatibility)
// ============================================================================

export type { ChartCategory, ChartStyleConfig, ChartVariant };
