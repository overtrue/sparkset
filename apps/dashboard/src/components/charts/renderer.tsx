'use client';

import type { ChartConfig } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
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
  /** Optional style configuration */
  style?: ChartStyleConfig;
  /** Optional className */
  className?: string;
}

export interface ChartFrameProps {
  chartType: ChartCategory;
  className?: string;
  children: ReactNode;
}

const CHART_FRAME_CLASS: Record<ChartCategory, string> = {
  area: 'mx-auto w-full max-w-[860px] min-h-[240px] aspect-[16/9] max-h-[420px]',
  bar: 'mx-auto w-full max-w-[860px] min-h-[240px] aspect-[16/9] max-h-[420px]',
  line: 'mx-auto w-full max-w-[860px] min-h-[240px] aspect-[16/9] max-h-[420px]',
  pie: 'mx-auto w-full max-w-[460px] min-h-[240px] aspect-square max-h-[420px]',
  radar: 'mx-auto w-full max-w-[460px] min-h-[240px] aspect-square max-h-[420px]',
  radial: 'mx-auto w-full max-w-[460px] min-h-[240px] aspect-square max-h-[420px]',
  table: 'w-full min-h-[240px] max-h-[460px] overflow-auto',
};

export function ChartFrame({ chartType, className, children }: ChartFrameProps) {
  return <div className={cn(CHART_FRAME_CLASS[chartType], className)}>{children}</div>;
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
  style: styleProp,
  className,
}: ChartRendererProps) {
  const chartData = data as Record<string, unknown>[];

  // Get default style from variant if provided, merge with style prop
  const variantStyle = variant ? getDefaultStyle(variant) : {};
  const style: ChartStyleConfig = {
    ...variantStyle,
    ...styleProp,
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

  // For categorical charts: infer keys from data shape
  const valueKey =
    dataKeys.find((k) => typeof chartData[0][k] === 'number') ||
    dataKeys[1] ||
    dataKeys[0] ||
    'value';

  // For radar/radial charts: use category field from spec, or infer from data
  // Radar/Radial charts should show category names (not values) on the angle axis
  let nameKey = dataKeys.find((k) => k !== valueKey);
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
    nameKey = dataKeys[0] || 'name';
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
