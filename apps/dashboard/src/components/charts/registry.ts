/**
 * Chart Registry
 * Defines all available chart types, variants, and their configurations
 */

import type {
  ChartCategory,
  ChartCategoryConfig,
  ChartStyleConfig,
  ChartVariant,
  ChartVariantConfig,
} from './types';

// ============================================================================
// Chart Variant Configurations
// ============================================================================

/**
 * All chart variant configurations
 */
export const CHART_VARIANTS: Record<ChartVariant, ChartVariantConfig> = {
  // Area Chart Variants
  'area-default': {
    id: 'area-default',
    category: 'area',
    name: 'Area Chart',
    description: 'Standard area chart with smooth curves',
    defaultStyle: {
      curveType: 'monotone',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      fillOpacity: 0.4,
    },
  },
  'area-linear': {
    id: 'area-linear',
    category: 'area',
    name: 'Area Chart - Linear',
    description: 'Area chart with linear interpolation',
    defaultStyle: {
      curveType: 'linear',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      fillOpacity: 0.4,
    },
  },
  'area-step': {
    id: 'area-step',
    category: 'area',
    name: 'Area Chart - Step',
    description: 'Area chart with step interpolation',
    defaultStyle: {
      curveType: 'step',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      fillOpacity: 0.4,
    },
  },
  'area-stacked': {
    id: 'area-stacked',
    category: 'area',
    name: 'Area Chart - Stacked',
    description: 'Stacked area chart for showing composition',
    defaultStyle: {
      curveType: 'monotone',
      stacked: true,
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      fillOpacity: 0.4,
    },
  },
  'area-gradient': {
    id: 'area-gradient',
    category: 'area',
    name: 'Area Chart - Gradient',
    description: 'Area chart with gradient fill',
    defaultStyle: {
      curveType: 'monotone',
      gradient: true,
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      fillOpacity: 0.8,
    },
  },

  // Bar Chart Variants
  'bar-default': {
    id: 'bar-default',
    category: 'bar',
    name: 'Bar Chart',
    description: 'Standard vertical bar chart',
    defaultStyle: {
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      horizontal: false,
    },
  },
  'bar-horizontal': {
    id: 'bar-horizontal',
    category: 'bar',
    name: 'Bar Chart - Horizontal',
    description: 'Horizontal bar chart',
    defaultStyle: {
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      horizontal: true,
    },
  },
  'bar-stacked': {
    id: 'bar-stacked',
    category: 'bar',
    name: 'Bar Chart - Stacked',
    description: 'Stacked bar chart for showing composition',
    defaultStyle: {
      stacked: true,
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      horizontal: false,
    },
  },
  'bar-grouped': {
    id: 'bar-grouped',
    category: 'bar',
    name: 'Bar Chart - Grouped',
    description: 'Grouped bar chart for comparison',
    defaultStyle: {
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      horizontal: false,
    },
  },
  'bar-negative': {
    id: 'bar-negative',
    category: 'bar',
    name: 'Bar Chart - Negative',
    description: 'Bar chart supporting negative values',
    defaultStyle: {
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      horizontal: false,
    },
  },

  // Line Chart Variants
  'line-default': {
    id: 'line-default',
    category: 'line',
    name: 'Line Chart',
    description: 'Standard line chart with smooth curves',
    defaultStyle: {
      curveType: 'monotone',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      showDots: false,
    },
  },
  'line-linear': {
    id: 'line-linear',
    category: 'line',
    name: 'Line Chart - Linear',
    description: 'Line chart with linear interpolation',
    defaultStyle: {
      curveType: 'linear',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      showDots: false,
    },
  },
  'line-step': {
    id: 'line-step',
    category: 'line',
    name: 'Line Chart - Step',
    description: 'Line chart with step interpolation',
    defaultStyle: {
      curveType: 'step',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      showDots: false,
    },
  },
  'line-dots': {
    id: 'line-dots',
    category: 'line',
    name: 'Line Chart - Dots',
    description: 'Line chart with data point markers',
    defaultStyle: {
      curveType: 'monotone',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      showDots: true,
    },
  },
  'line-multiple': {
    id: 'line-multiple',
    category: 'line',
    name: 'Line Chart - Multiple',
    description: 'Multiple line chart for comparison',
    defaultStyle: {
      curveType: 'monotone',
      showGrid: true,
      showTooltip: true,
      showLegend: true,
      showDots: false,
    },
  },

  // Pie Chart Variants
  'pie-default': {
    id: 'pie-default',
    category: 'pie',
    name: 'Pie Chart',
    description: 'Standard pie chart',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      innerRadius: 0,
      outerRadius: 80,
      paddingAngle: 0,
    },
  },
  'pie-donut': {
    id: 'pie-donut',
    category: 'pie',
    name: 'Donut Chart',
    description: 'Donut chart with hollow center',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      innerRadius: 60,
      outerRadius: 80,
      paddingAngle: 2,
    },
  },
  'pie-donut-text': {
    id: 'pie-donut-text',
    category: 'pie',
    name: 'Donut Chart - Text',
    description: 'Donut chart with center text',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      innerRadius: 60,
      outerRadius: 80,
      paddingAngle: 2,
    },
  },
  'pie-label': {
    id: 'pie-label',
    category: 'pie',
    name: 'Pie Chart - Labels',
    description: 'Pie chart with labels',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      showLabels: true,
      innerRadius: 0,
      outerRadius: 80,
      paddingAngle: 0,
    },
  },
  'pie-legend': {
    id: 'pie-legend',
    category: 'pie',
    name: 'Pie Chart - Legend',
    description: 'Pie chart with detailed legend',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      innerRadius: 0,
      outerRadius: 80,
      paddingAngle: 0,
    },
  },

  // Radar Chart Variants
  'radar-default': {
    id: 'radar-default',
    category: 'radar',
    name: 'Radar Chart',
    description: 'Standard radar/spider chart',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      gridType: 'polygon',
      fillOpacity: 0.6,
    },
  },
  'radar-dots': {
    id: 'radar-dots',
    category: 'radar',
    name: 'Radar Chart - Dots',
    description: 'Radar chart with data point markers',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      showDots: true,
      gridType: 'polygon',
      fillOpacity: 0.6,
    },
  },
  'radar-grid-circle': {
    id: 'radar-grid-circle',
    category: 'radar',
    name: 'Radar Chart - Circle Grid',
    description: 'Radar chart with circular grid',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      gridType: 'circle',
      fillOpacity: 0.6,
    },
  },
  'radar-grid-filled': {
    id: 'radar-grid-filled',
    category: 'radar',
    name: 'Radar Chart - Filled',
    description: 'Radar chart with filled area',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      gridType: 'polygon',
      fillOpacity: 0.8,
    },
  },
  'radar-multiple': {
    id: 'radar-multiple',
    category: 'radar',
    name: 'Radar Chart - Multiple',
    description: 'Multiple radar chart for comparison',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      gridType: 'polygon',
      fillOpacity: 0.4,
    },
  },

  // Radial Chart Variants
  'radial-default': {
    id: 'radial-default',
    category: 'radial',
    name: 'Radial Chart',
    description: 'Standard radial bar chart',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      innerRadius: 30,
      outerRadius: 110,
    },
  },
  'radial-label': {
    id: 'radial-label',
    category: 'radial',
    name: 'Radial Chart - Label',
    description: 'Radial chart with labels',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      showLabels: true,
      innerRadius: 30,
      outerRadius: 110,
    },
  },
  'radial-grid': {
    id: 'radial-grid',
    category: 'radial',
    name: 'Radial Chart - Grid',
    description: 'Radial chart with grid lines',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      showGrid: true,
      innerRadius: 30,
      outerRadius: 110,
    },
  },
  'radial-text': {
    id: 'radial-text',
    category: 'radial',
    name: 'Radial Chart - Text',
    description: 'Radial chart with center text',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      innerRadius: 30,
      outerRadius: 110,
    },
  },
  'radial-stacked': {
    id: 'radial-stacked',
    category: 'radial',
    name: 'Radial Chart - Stacked',
    description: 'Stacked radial chart',
    defaultStyle: {
      showTooltip: true,
      showLegend: true,
      stacked: true,
      innerRadius: 30,
      outerRadius: 110,
    },
  },

  // Table
  'table-default': {
    id: 'table-default',
    category: 'table',
    name: 'Table',
    description: 'Data table view',
    defaultStyle: {},
  },
};

// ============================================================================
// Chart Category Configurations
// ============================================================================

/**
 * All chart category configurations
 */
export const CHART_CATEGORIES: Record<ChartCategory, ChartCategoryConfig> = {
  area: {
    id: 'area',
    name: 'Area Chart',
    description: 'Show trends and changes over time',
    variants: ['area-default', 'area-linear', 'area-step', 'area-stacked', 'area-gradient'],
    defaultVariant: 'area-default',
    supportsMultipleY: true,
    requiresCategoryField: false,
  },
  bar: {
    id: 'bar',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    variants: ['bar-default', 'bar-horizontal', 'bar-stacked', 'bar-grouped', 'bar-negative'],
    defaultVariant: 'bar-default',
    supportsMultipleY: true,
    requiresCategoryField: false,
  },
  line: {
    id: 'line',
    name: 'Line Chart',
    description: 'Show trends and patterns over time',
    variants: ['line-default', 'line-linear', 'line-step', 'line-dots', 'line-multiple'],
    defaultVariant: 'line-default',
    supportsMultipleY: true,
    requiresCategoryField: false,
  },
  pie: {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Show proportions and percentages',
    variants: ['pie-default', 'pie-donut', 'pie-donut-text', 'pie-label', 'pie-legend'],
    defaultVariant: 'pie-donut',
    supportsMultipleY: false,
    requiresCategoryField: true,
  },
  radar: {
    id: 'radar',
    name: 'Radar Chart',
    description: 'Compare multiple variables',
    variants: [
      'radar-default',
      'radar-dots',
      'radar-grid-circle',
      'radar-grid-filled',
      'radar-multiple',
    ],
    defaultVariant: 'radar-default',
    supportsMultipleY: true,
    requiresCategoryField: true,
  },
  radial: {
    id: 'radial',
    name: 'Radial Chart',
    description: 'Show progress or gauge values',
    variants: ['radial-default', 'radial-label', 'radial-grid', 'radial-text', 'radial-stacked'],
    defaultVariant: 'radial-default',
    supportsMultipleY: false,
    requiresCategoryField: true,
  },
  table: {
    id: 'table',
    name: 'Table',
    description: 'Display data in tabular format',
    variants: ['table-default'],
    defaultVariant: 'table-default',
    supportsMultipleY: true,
    requiresCategoryField: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get variant configuration by ID
 */
export function getVariantConfig(variant: ChartVariant): ChartVariantConfig {
  return CHART_VARIANTS[variant];
}

/**
 * Get category configuration by ID
 */
export function getCategoryConfig(category: ChartCategory): ChartCategoryConfig {
  return CHART_CATEGORIES[category];
}

/**
 * Get default variant for a category
 */
export function getDefaultVariant(category: ChartCategory): ChartVariant {
  return CHART_CATEGORIES[category].defaultVariant;
}

/**
 * Get default style for a variant
 */
export function getDefaultStyle(variant: ChartVariant): ChartStyleConfig {
  return CHART_VARIANTS[variant].defaultStyle;
}

/**
 * Get all variants for a category
 */
export function getVariantsForCategory(category: ChartCategory): ChartVariantConfig[] {
  return CHART_CATEGORIES[category].variants.map((v) => CHART_VARIANTS[v]);
}

/**
 * Get all chart categories as array
 */
export function getAllCategories(): ChartCategoryConfig[] {
  return Object.values(CHART_CATEGORIES);
}

/**
 * Get all chart variants as array
 */
export function getAllVariants(): ChartVariantConfig[] {
  return Object.values(CHART_VARIANTS);
}

/**
 * Parse variant string to get category
 */
export function getCategoryFromVariant(variant: ChartVariant): ChartCategory {
  return CHART_VARIANTS[variant].category;
}

/**
 * Check if a category supports multiple Y fields
 */
export function categorySupportsMultipleY(category: ChartCategory): boolean {
  return CHART_CATEGORIES[category].supportsMultipleY;
}

/**
 * Check if a category requires category/name field
 */
export function categoryRequiresCategoryField(category: ChartCategory): boolean {
  return CHART_CATEGORIES[category].requiresCategoryField;
}
