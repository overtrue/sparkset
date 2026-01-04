/**
 * Chart Utility Functions
 * Shared utilities for data transformation and configuration building
 */

import type { ChartConfig } from '@/components/ui/chart';
import type { ChartCategory, ChartSpec, YFieldConfig } from './types';
import { getChartColor } from './types';

// ============================================================================
// Data Transformation
// ============================================================================

/**
 * Transform raw data based on chart specification
 */
export function transformData(
  rows: Record<string, unknown>[],
  spec: ChartSpec,
): Record<string, unknown>[] {
  const chartType = spec.chartType;

  // Table: return raw data
  if (chartType === 'table') {
    return rows;
  }

  // Pie/Radial: aggregate by category field
  if (chartType === 'pie' || chartType === 'radial') {
    return transformCategoricalData(rows, spec);
  }

  // Radar: transform for radar chart format
  if (chartType === 'radar') {
    return transformRadarData(rows, spec);
  }

  // Cartesian charts (line, bar, area): aggregate by x field
  return transformCartesianData(rows, spec);
}

/**
 * Transform data for categorical charts (pie, radial)
 */
function transformCategoricalData(
  rows: Record<string, unknown>[],
  spec: ChartSpec,
): Record<string, unknown>[] {
  const xField = spec.encoding.x?.field || spec.encoding.category?.field;
  const yFields = spec.encoding.y || [];

  if (!xField || yFields.length === 0) {
    return rows;
  }

  const grouped = aggregateByField(rows, xField, yFields);

  return Object.entries(grouped).map(([xValue, values]) => {
    // Ensure category value is always a string (not a number)
    // This is critical for categorical charts (pie, radial) where category labels should be displayed as text
    const result: Record<string, unknown> = { [xField]: String(xValue) };

    yFields.forEach((yField) => {
      if (yField.agg === 'avg') {
        const sum = values[`${yField.field}_sum`] || 0;
        const count = values[`${yField.field}_count`] || 1;
        result[yField.field] = sum / count;
      } else {
        // Ensure the value is a number, not undefined or null
        // This is critical for radial charts where NaN values cause rendering issues
        const value = values[yField.field];
        // Debug: Log the value to verify it's correct
        if (process.env.NODE_ENV === 'development') {
           
          console.log(
            '[transformCategoricalData] yField:',
            yField.field,
            'value:',
            value,
            'type:',
            typeof value,
            'values:',
            values,
          );
        }
        // Convert to number, ensuring it's a valid number
        const numValue = typeof value === 'number' ? value : Number(value);
        result[yField.field] = isNaN(numValue) ? 0 : numValue;
      }
    });

    return result;
  });
}

/**
 * Transform data for radar charts
 */
function transformRadarData(
  rows: Record<string, unknown>[],
  spec: ChartSpec,
): Record<string, unknown>[] {
  const categoryField = spec.encoding.category?.field || spec.encoding.x?.field;
  const yFields = spec.encoding.y || [];

  if (!categoryField) {
    return rows;
  }

  // Group by category and aggregate
  const grouped = aggregateByField(rows, categoryField, yFields);

  return Object.entries(grouped).map(([categoryValue, values]) => {
    // Ensure category value is always a string (not a number)
    // This is critical for radar charts where category labels should be displayed as text
    const result: Record<string, unknown> = { [categoryField]: String(categoryValue) };

    yFields.forEach((yField) => {
      if (yField.agg === 'avg') {
        const sum = values[`${yField.field}_sum`] || 0;
        const count = values[`${yField.field}_count`] || 1;
        result[yField.field] = sum / count;
      } else {
        result[yField.field] = values[yField.field];
      }
    });

    return result;
  });
}

/**
 * Transform data for cartesian charts (line, bar, area)
 */
function transformCartesianData(
  rows: Record<string, unknown>[],
  spec: ChartSpec,
): Record<string, unknown>[] {
  const xField = spec.encoding.x?.field;
  const yFields = spec.encoding.y || [];

  if (!xField) {
    return rows;
  }

  // For simple display without aggregation, return raw data
  // This allows the chart to show all data points
  const needsAggregation =
    yFields.some((y) => y.agg !== 'sum') || hasDuplicateXValues(rows, xField);

  if (!needsAggregation) {
    return rows;
  }

  const grouped = aggregateByField(rows, xField, yFields);

  return Object.entries(grouped).map(([xValue, values]) => {
    const result: Record<string, unknown> = { [xField]: xValue };

    yFields.forEach((yField) => {
      if (yField.agg === 'avg') {
        const sum = values[`${yField.field}_sum`] || 0;
        const count = values[`${yField.field}_count`] || 1;
        result[yField.field] = sum / count;
      } else {
        result[yField.field] = values[yField.field];
      }
    });

    return result;
  });
}

/**
 * Check if there are duplicate X values that need aggregation
 */
function hasDuplicateXValues(rows: Record<string, unknown>[], xField: string): boolean {
  const seen = new Set<string>();
  for (const row of rows) {
    const xValue = String(row[xField]);
    if (seen.has(xValue)) {
      return true;
    }
    seen.add(xValue);
  }
  return false;
}

/**
 * Aggregate data by a field
 */
function aggregateByField(
  rows: Record<string, unknown>[],
  groupField: string,
  yFields: YFieldConfig[],
): Record<string, Record<string, number>> {
  const grouped: Record<string, Record<string, number>> = {};

  rows.forEach((row) => {
    const groupValue = String(row[groupField]);
    if (!grouped[groupValue]) {
      grouped[groupValue] = {};
    }

    yFields.forEach((yField) => {
      const value = Number(row[yField.field]) || 0;
      if (!grouped[groupValue][yField.field]) {
        grouped[groupValue][yField.field] = 0;
      }

      switch (yField.agg) {
        case 'sum':
          grouped[groupValue][yField.field] += value;
          break;
        case 'count':
          grouped[groupValue][yField.field] += 1;
          break;
        case 'min':
          if (
            grouped[groupValue][yField.field] === 0 ||
            value < grouped[groupValue][yField.field]
          ) {
            grouped[groupValue][yField.field] = value;
          }
          break;
        case 'max':
          if (value > grouped[groupValue][yField.field]) {
            grouped[groupValue][yField.field] = value;
          }
          break;
        case 'avg':
          // Track sum and count for average calculation
          if (!grouped[groupValue][`${yField.field}_sum`]) {
            grouped[groupValue][`${yField.field}_sum`] = 0;
            grouped[groupValue][`${yField.field}_count`] = 0;
          }
          grouped[groupValue][`${yField.field}_sum`] += value;
          grouped[groupValue][`${yField.field}_count`] += 1;
          break;
      }
    });
  });

  return grouped;
}

// ============================================================================
// Configuration Building
// ============================================================================

/**
 * Build chart config from specification
 */
export function buildConfig(spec: ChartSpec): ChartConfig {
  const config: ChartConfig = {};
  const yFields = spec.encoding.y || [];

  yFields.forEach((yField, index) => {
    config[yField.field] = {
      label: yField.label || yField.field,
      color: yField.color || getChartColor(index),
    };
  });

  return config;
}

/**
 * Build chart config from form data
 */
export function buildConfigFromFormData(
  yFields: { field: string; label?: string; color?: string }[],
): ChartConfig {
  const config: ChartConfig = {};

  yFields.forEach((yField, index) => {
    config[yField.field] = {
      label: yField.label || yField.field,
      color: yField.color || getChartColor(index),
    };
  });

  return config;
}

// ============================================================================
// Key Extraction
// ============================================================================

/**
 * Extract X key from data
 */
export function extractXKey(data: Record<string, unknown>[], spec?: ChartSpec): string {
  if (spec?.encoding.x?.field) {
    return spec.encoding.x.field;
  }
  // Default to first key in data
  return Object.keys(data[0] || {})[0] || 'x';
}

/**
 * Extract Y keys from config
 */
export function extractYKeys(config: ChartConfig): string[] {
  return Object.keys(config);
}

/**
 * Extract name key for categorical charts
 */
export function extractNameKey(data: Record<string, unknown>[], valueKey: string): string {
  const dataKeys = Object.keys(data[0] || {});
  return dataKeys.find((k) => k !== valueKey) || 'name';
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Get computed color value from CSS variable
 */
export function getComputedColor(cssVar: string): string {
  if (typeof window === 'undefined') {
    return cssVar;
  }

  // If it's already a hex/rgb value, return as-is
  if (!cssVar.startsWith('var(')) {
    return cssVar;
  }

  // Extract variable name
  const varName = cssVar.replace('var(', '').replace(')', '');
  const computed = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

  return computed || cssVar;
}

/**
 * Enrich pie chart data with fill colors
 * Following shadcn pattern: use var(--color-xxx) which ChartContainer resolves via ChartStyle
 */
export function enrichPieData(
  data: Record<string, unknown>[],
  config: ChartConfig,
  nameKey: string,
): Record<string, unknown>[] {
  const configKeys = Object.keys(config);

  return data.map((entry, index) => {
    const entryName = String(entry[nameKey]);
    // Find config key by matching label or direct key
    let configKey = configKeys.find((k) => config[k].label === entryName || k === entryName);

    // If no match found, use index-based color assignment
    // For pie/radial charts, each entry should get a unique color based on its index
    // This ensures all entries have distinct colors even if config doesn't match
    const fillColor = configKey ? `var(--color-${configKey})` : getChartColor(index); // Use index-based color if no config match

    return {
      ...entry,
      fill: fillColor,
    };
  });
}

// ============================================================================
// Chart Type Utilities
// ============================================================================

/**
 * Check if chart type is cartesian (has X/Y axes)
 */
export function isCartesianChart(chartType: ChartCategory): boolean {
  return ['area', 'bar', 'line'].includes(chartType);
}

/**
 * Check if chart type is categorical (pie, radial)
 */
export function isCategoricalChart(chartType: ChartCategory): boolean {
  return ['pie', 'radial'].includes(chartType);
}

/**
 * Check if chart type supports multiple Y fields
 */
export function supportsMultipleYFields(chartType: ChartCategory): boolean {
  return ['area', 'bar', 'line', 'radar'].includes(chartType);
}

/**
 * Get default curve type for a variant
 */
export function getCurveType(variant?: string): 'monotone' | 'linear' | 'step' {
  if (!variant) return 'monotone';

  if (variant.includes('linear')) return 'linear';
  if (variant.includes('step')) return 'step';

  return 'monotone';
}

/**
 * Get default style from variant
 */
export function getStyleFromVariant(variant?: string): Partial<{
  curveType: 'monotone' | 'linear' | 'step';
  showDots: boolean;
  gradient: boolean;
  stacked: boolean;
  horizontal: boolean;
  innerRadius: number;
  outerRadius: number;
  gridType: 'polygon' | 'circle';
}> {
  if (!variant) return {};

  const style: Record<string, unknown> = {};

  // Curve type
  if (variant.includes('linear')) style.curveType = 'linear';
  else if (variant.includes('step')) style.curveType = 'step';
  else style.curveType = 'monotone';

  // Dots
  if (variant.includes('dots')) style.showDots = true;

  // Gradient
  if (variant.includes('gradient')) style.gradient = true;

  // Stacked
  if (variant.includes('stacked')) style.stacked = true;

  // Horizontal
  if (variant.includes('horizontal')) style.horizontal = true;

  // Donut
  if (variant.includes('donut')) {
    style.innerRadius = 60;
    style.outerRadius = 80;
  }

  // Radar grid
  if (variant.includes('grid-circle')) style.gridType = 'circle';

  return style;
}
