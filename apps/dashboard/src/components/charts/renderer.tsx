'use client';

import type { ChartConfig } from '@/components/ui/chart';
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
import type { ChartCategory, ChartStyleConfig, ChartVariant } from './types';

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

  // For radar/radial charts: use category field from spec, or infer from data
  // Radar/Radial charts should show category names (not values) on the angle axis
  let nameKey = pieConfig?.nameKey;
  if (!nameKey && (chartType === 'radar' || chartType === 'radial')) {
    // For radar/radial, category field should be the first non-numeric field that's not in configKeys
    // This is the field used for grouping (e.g., "genre", "category")
    // Priority: find field that is not in configKeys and not numeric
    nameKey =
      dataKeys.find((k) => {
        const value = chartData[0][k];
        return (
          !configKeys.includes(k) &&
          typeof value !== 'number' &&
          value !== null &&
          value !== undefined
        );
      }) ||
      dataKeys.find((k) => k !== valueKey && !configKeys.includes(k)) ||
      dataKeys[0] ||
      'name';
  } else if (!nameKey) {
    nameKey = dataKeys.find((k) => k !== valueKey) || 'name';
  }

  // Debug: Log for radar charts
  if (chartType === 'radar' && process.env.NODE_ENV === 'development') {
     
    console.log(
      '[ChartRenderer] Radar chart - nameKey:',
      nameKey,
      'dataKeys:',
      dataKeys,
      'configKeys:',
      configKeys,
      'first data item:',
      chartData[0],
    );
  }

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
