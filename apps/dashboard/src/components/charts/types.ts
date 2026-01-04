/**
 * Chart System Type Definitions
 * Unified type definitions for chart rendering and configuration
 */

import type { ChartConfig } from '@/components/ui/chart';

// ============================================================================
// Chart Categories and Variants
// ============================================================================

/**
 * Main chart categories supported by the system
 */
export type ChartCategory = 'area' | 'bar' | 'line' | 'pie' | 'radar' | 'radial' | 'table';

/**
 * Chart variants for each category
 * Format: {category}-{variant}
 */
export type ChartVariant =
  // Area Chart variants
  | 'area-default'
  | 'area-linear'
  | 'area-step'
  | 'area-stacked'
  | 'area-gradient'
  // Bar Chart variants
  | 'bar-default'
  | 'bar-horizontal'
  | 'bar-stacked'
  | 'bar-grouped'
  | 'bar-negative'
  // Line Chart variants
  | 'line-default'
  | 'line-linear'
  | 'line-step'
  | 'line-dots'
  | 'line-multiple'
  // Pie Chart variants
  | 'pie-default'
  | 'pie-donut'
  | 'pie-donut-text'
  | 'pie-label'
  | 'pie-legend'
  // Radar Chart variants
  | 'radar-default'
  | 'radar-dots'
  | 'radar-grid-circle'
  | 'radar-grid-filled'
  | 'radar-multiple'
  // Radial Chart variants
  | 'radial-default'
  | 'radial-label'
  | 'radial-grid'
  | 'radial-text'
  | 'radial-stacked'
  // Table (no variants)
  | 'table-default';

// ============================================================================
// Chart Configuration
// ============================================================================

/**
 * Line/Area curve type
 */
export type CurveType = 'monotone' | 'linear' | 'step' | 'natural';

/**
 * Y-axis field configuration
 */
export interface YFieldConfig {
  field: string;
  type: 'quantitative';
  agg: 'sum' | 'avg' | 'min' | 'max' | 'count';
  label?: string;
  color?: string;
}

/**
 * Chart encoding configuration
 */
export interface ChartEncoding {
  x?: {
    field: string;
    type: string;
    label?: string;
  };
  y?: YFieldConfig[];
  series?: {
    field: string;
    type: string;
  };
  // For radar/radial charts
  category?: {
    field: string;
    label?: string;
  };
  value?: {
    field: string;
    label?: string;
  };
}

/**
 * Chart style configuration
 */
export interface ChartStyleConfig {
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  smooth?: boolean;
  aspectRatio?: number;
  // Curve type for line/area charts
  curveType?: CurveType;
  // Show dots on line/area charts
  showDots?: boolean;
  // Gradient fill for area charts
  gradient?: boolean;
  // Horizontal orientation for bar charts
  horizontal?: boolean;
  // Pie/Donut specific
  innerRadius?: number;
  outerRadius?: number;
  paddingAngle?: number;
  // Show labels on pie
  showLabels?: boolean;
  // Radar grid type
  gridType?: 'polygon' | 'circle';
  // Fill opacity for areas
  fillOpacity?: number;
  // Radial chart angles
  startAngle?: number;
  endAngle?: number;
}

/**
 * Complete chart specification
 */
export interface ChartSpec {
  specVersion: '1.0';
  chartType: ChartCategory;
  variant?: ChartVariant;
  encoding: ChartEncoding;
  transform?: { op: string; [key: string]: unknown }[];
  style?: ChartStyleConfig;
  rechartsOverrides?: Record<string, unknown>;
}

// ============================================================================
// Renderer Props
// ============================================================================

/**
 * Common props for all chart renderers
 */
export interface BaseChartProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  className?: string;
  style?: ChartStyleConfig;
}

/**
 * Props for cartesian charts (area, bar, line)
 */
export interface CartesianChartProps extends BaseChartProps {
  xKey: string;
  yKeys: string[];
}

/**
 * Props for pie charts
 */
export interface PieChartProps extends BaseChartProps {
  nameKey: string;
  valueKey: string;
}

/**
 * Props for radar charts
 */
export interface RadarChartProps extends BaseChartProps {
  categoryKey: string;
  valueKeys: string[];
}

/**
 * Props for radial charts
 */
export interface RadialChartProps extends BaseChartProps {
  nameKey: string;
  valueKey: string;
}

/**
 * Props for table
 */
export interface TableChartProps {
  data: Record<string, unknown>[];
  className?: string;
}

/**
 * Union type for all chart renderer props
 */
export type ChartRendererProps =
  | ({ chartType: 'area' | 'bar' | 'line' } & CartesianChartProps)
  | ({ chartType: 'pie' } & PieChartProps)
  | ({ chartType: 'radar' } & RadarChartProps)
  | ({ chartType: 'radial' } & RadialChartProps)
  | ({ chartType: 'table' } & TableChartProps);

// ============================================================================
// Chart Variant Configuration
// ============================================================================

/**
 * Configuration for a chart variant
 */
export interface ChartVariantConfig {
  id: ChartVariant;
  category: ChartCategory;
  name: string;
  description: string;
  // Default style config for this variant
  defaultStyle: ChartStyleConfig;
  // Preview icon or thumbnail
  icon?: string;
}

/**
 * Chart category configuration
 */
export interface ChartCategoryConfig {
  id: ChartCategory;
  name: string;
  description: string;
  variants: ChartVariant[];
  // Default variant for this category
  defaultVariant: ChartVariant;
  // Whether this chart type supports multiple Y fields
  supportsMultipleY: boolean;
  // Whether this chart type requires category/name field
  requiresCategoryField: boolean;
}

// ============================================================================
// Color Palette
// ============================================================================

/**
 * Predefined chart colors using CSS variables
 */
export const CHART_COLORS = [
  { name: 'Chart 1', value: 'var(--chart-1)', cssVar: '--chart-1' },
  { name: 'Chart 2', value: 'var(--chart-2)', cssVar: '--chart-2' },
  { name: 'Chart 3', value: 'var(--chart-3)', cssVar: '--chart-3' },
  { name: 'Chart 4', value: 'var(--chart-4)', cssVar: '--chart-4' },
  { name: 'Chart 5', value: 'var(--chart-5)', cssVar: '--chart-5' },
  { name: 'Chart 6', value: 'var(--chart-6)', cssVar: '--chart-6' },
  { name: 'Chart 7', value: 'var(--chart-7)', cssVar: '--chart-7' },
  { name: 'Chart 8', value: 'var(--chart-8)', cssVar: '--chart-8' },
  { name: 'Chart 9', value: 'var(--chart-9)', cssVar: '--chart-9' },
  { name: 'Chart 10', value: 'var(--chart-10)', cssVar: '--chart-10' },
] as const;

/**
 * Get chart color by index (cycles through colors)
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length].value;
}

// ============================================================================
// Render Result (from API)
// ============================================================================

/**
 * Chart render result returned from API
 */
export interface ChartRenderResult {
  chartType: ChartCategory;
  variant?: ChartVariant;
  data: unknown[];
  config: ChartConfig;
  rechartsProps: Record<string, unknown>;
  style?: ChartStyleConfig;
  warnings?: string[];
}
