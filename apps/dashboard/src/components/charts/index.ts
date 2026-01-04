/**
 * Chart Components Index
 * Export all chart-related components and utilities
 */

// Types
export type {
  ChartCategory,
  ChartVariant,
  ChartSpec,
  ChartStyleConfig,
  ChartEncoding,
  YFieldConfig,
  ChartRenderResult,
  ChartVariantConfig,
  ChartCategoryConfig,
  CurveType,
} from './types';

export { CHART_COLORS, getChartColor } from './types';

// Registry
export {
  CHART_VARIANTS,
  CHART_CATEGORIES,
  getVariantConfig,
  getCategoryConfig,
  getDefaultVariant,
  getDefaultStyle,
  getVariantsForCategory,
  getAllCategories,
  getAllVariants,
  getCategoryFromVariant,
  categorySupportsMultipleY,
  categoryRequiresCategoryField,
} from './registry';

// Utilities
export {
  transformData,
  buildConfig,
  buildConfigFromFormData,
  extractXKey,
  extractYKeys,
  extractNameKey,
  enrichPieData,
  isCartesianChart,
  isCategoricalChart,
  supportsMultipleYFields,
  getCurveType,
  getStyleFromVariant,
} from './utils';

// Components
export { ChartRenderer, type ChartRendererProps } from './renderer';
export { ChartBuilder, type ChartBuilderHandle, type ChartSaveData } from './builder';
export { ChartBuilderClient } from './builder-client';
export {
  ChartSelector,
  ChartTypeSelector,
  ChartVariantSelector,
  type ChartSelectorProps,
  type ChartTypeSelectorProps,
  type ChartVariantSelectorProps,
} from './chart-selector';

// Individual renderers (for advanced usage)
export {
  AreaChartRenderer,
  BarChartRenderer,
  LineChartRenderer,
  PieChartRenderer,
  RadarChartRenderer,
  RadialChartRenderer,
  TableRenderer,
} from './renderers';
