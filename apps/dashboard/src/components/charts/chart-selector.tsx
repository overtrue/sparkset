'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from '@/i18n/use-translations';
import { cn } from '@/lib/utils';
import {
  RiBarChart2Line,
  RiLineChartLine,
  RiPieChart2Line,
  RiRadarLine,
  RiStackLine,
  RiTableLine,
} from '@remixicon/react';
import * as React from 'react';
import { CHART_VARIANTS, getAllCategories, getVariantsForCategory } from './registry';
import type { ChartCategory, ChartVariant } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ChartSelectorProps {
  /** Currently selected variant */
  value?: ChartVariant;
  /** Callback when variant is selected */
  onChange?: (variant: ChartVariant, category: ChartCategory) => void;
  /** Trigger element */
  children?: React.ReactNode;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Optional trigger id for label association */
  triggerId?: string;
}

// ============================================================================
// Icons for Chart Categories
// ============================================================================

const CATEGORY_ICONS: Record<ChartCategory, React.ComponentType<{ className?: string }>> = {
  area: RiStackLine,
  bar: RiBarChart2Line,
  line: RiLineChartLine,
  pie: RiPieChart2Line,
  radar: RiRadarLine,
  radial: RiPieChart2Line,
  table: RiTableLine,
};

const DEFAULT_CATEGORY: ChartCategory = 'bar';
const DEFAULT_CATEGORY_ICON = RiBarChart2Line;

// ============================================================================
// Mini Chart Preview Components
// ============================================================================

const MiniAreaChart = React.memo(function MiniAreaChart({ variant }: { variant: ChartVariant }) {
  const isStacked = variant.includes('stacked');
  const isStep = variant.includes('step');
  const isLinear = variant.includes('linear');
  const isGradient = variant.includes('gradient');

  const pathD = isStep
    ? 'M 5 25 L 5 20 L 15 20 L 15 15 L 25 15 L 25 10 L 35 10 L 35 5'
    : isLinear
      ? 'M 5 25 L 15 18 L 25 12 L 35 5'
      : 'M 5 25 Q 15 20 20 15 Q 25 10 35 5';

  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        {isGradient && (
          <linearGradient id={`gradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        )}
      </defs>
      <path
        d={`${pathD} L 35 30 L 5 30 Z`}
        fill={isGradient ? `url(#gradient-${variant})` : 'currentColor'}
        fillOpacity={isGradient ? 1 : 0.3}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {isStacked && (
        <path
          d="M 5 30 L 5 28 Q 15 26 20 24 Q 25 22 35 20 L 35 30 Z"
          fill="currentColor"
          fillOpacity="0.5"
        />
      )}
    </svg>
  );
});

const MiniBarChart = React.memo(function MiniBarChart({ variant }: { variant: ChartVariant }) {
  const isHorizontal = variant.includes('horizontal');
  const isStacked = variant.includes('stacked');

  if (isHorizontal) {
    return (
      <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
        <rect x="5" y="4" width="25" height="5" fill="currentColor" rx="1" />
        <rect x="5" y="12" width="18" height="5" fill="currentColor" fillOpacity="0.6" rx="1" />
        <rect x="5" y="20" width="30" height="5" fill="currentColor" fillOpacity="0.3" rx="1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect x="6" y="10" width="6" height="18" fill="currentColor" rx="1" />
      <rect
        x="14"
        y={isStacked ? 5 : 15}
        width="6"
        height={isStacked ? 23 : 13}
        fill="currentColor"
        fillOpacity={isStacked ? 0.6 : 1}
        rx="1"
      />
      {isStacked && <rect x="14" y="18" width="6" height="10" fill="currentColor" rx="1" />}
      <rect x="22" y="8" width="6" height="20" fill="currentColor" fillOpacity="0.6" rx="1" />
      <rect x="30" y="12" width="6" height="16" fill="currentColor" fillOpacity="0.3" rx="1" />
    </svg>
  );
});

const MiniLineChart = React.memo(function MiniLineChart({ variant }: { variant: ChartVariant }) {
  const isStep = variant.includes('step');
  const isLinear = variant.includes('linear');
  const showDots = variant.includes('dots');

  const pathD = isStep
    ? 'M 5 22 L 5 18 L 12 18 L 12 12 L 20 12 L 20 8 L 28 8 L 28 5 L 35 5'
    : isLinear
      ? 'M 5 22 L 12 18 L 20 12 L 28 8 L 35 5'
      : 'M 5 22 Q 12 18 15 15 Q 20 10 28 8 Q 32 6 35 5';

  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {showDots && (
        <>
          <circle cx="5" cy="22" r="2" fill="currentColor" />
          <circle cx="12" cy="18" r="2" fill="currentColor" />
          <circle cx="20" cy="12" r="2" fill="currentColor" />
          <circle cx="28" cy="8" r="2" fill="currentColor" />
          <circle cx="35" cy="5" r="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
});

const MiniPieChart = React.memo(function MiniPieChart({ variant }: { variant: ChartVariant }) {
  const isDonut = variant.includes('donut');
  const showLabels = variant.includes('label');

  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      {/* Pie slices */}
      <path d="M 20 15 L 20 3 A 12 12 0 0 1 31 15 Z" fill="currentColor" />
      <path d="M 20 15 L 31 15 A 12 12 0 0 1 20 27 Z" fill="currentColor" fillOpacity="0.6" />
      <path d="M 20 15 L 20 27 A 12 12 0 0 1 9 15 Z" fill="currentColor" fillOpacity="0.4" />
      <path d="M 20 15 L 9 15 A 12 12 0 0 1 20 3 Z" fill="currentColor" fillOpacity="0.2" />

      {/* Donut hole */}
      {isDonut && <circle cx="20" cy="15" r="6" fill="white" className="dark:fill-background" />}

      {/* Labels */}
      {showLabels && (
        <>
          <text x="26" y="10" fontSize="4" fill="currentColor">
            40%
          </text>
          <text x="26" y="22" fontSize="4" fill="currentColor">
            30%
          </text>
        </>
      )}
    </svg>
  );
});

const MiniRadarChart = React.memo(function MiniRadarChart({ variant }: { variant: ChartVariant }) {
  const isCircle = variant.includes('circle');
  const showDots = variant.includes('dots');

  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      {/* Grid */}
      {isCircle ? (
        <>
          <circle cx="20" cy="15" r="10" fill="none" stroke="currentColor" strokeOpacity="0.2" />
          <circle cx="20" cy="15" r="6" fill="none" stroke="currentColor" strokeOpacity="0.2" />
        </>
      ) : (
        <polygon
          points="20,5 30,12 27,23 13,23 10,12"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
        />
      )}

      {/* Data area */}
      <polygon
        points="20,7 28,13 25,21 15,21 12,13"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* Dots */}
      {showDots && (
        <>
          <circle cx="20" cy="7" r="1.5" fill="currentColor" />
          <circle cx="28" cy="13" r="1.5" fill="currentColor" />
          <circle cx="25" cy="21" r="1.5" fill="currentColor" />
          <circle cx="15" cy="21" r="1.5" fill="currentColor" />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
});

const MiniRadialChart = React.memo(function MiniRadialChart({
  variant,
}: {
  variant: ChartVariant;
}) {
  const showLabels = variant.includes('label');
  const isStacked = variant.includes('stacked');

  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      {/* Background track */}
      <path
        d="M 8 25 A 12 12 0 0 1 32 25"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Progress bar */}
      <path
        d="M 8 25 A 12 12 0 0 1 26 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {isStacked && (
        <path
          d="M 10 23 A 10 10 0 0 1 20 5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {showLabels && (
        <text x="20" y="20" fontSize="6" fill="currentColor" textAnchor="middle">
          75%
        </text>
      )}
    </svg>
  );
});

const MiniTableChart = React.memo(function MiniTableChart() {
  return (
    <svg viewBox="0 0 40 30" className="h-full w-full" aria-hidden="true" focusable="false">
      {/* Header */}
      <rect x="4" y="4" width="32" height="6" fill="currentColor" fillOpacity="0.2" rx="1" />

      {/* Rows */}
      <line x1="4" y1="14" x2="36" y2="14" stroke="currentColor" strokeOpacity="0.3" />
      <line x1="4" y1="20" x2="36" y2="20" stroke="currentColor" strokeOpacity="0.3" />
      <line x1="4" y1="26" x2="36" y2="26" stroke="currentColor" strokeOpacity="0.3" />

      {/* Columns */}
      <line x1="15" y1="4" x2="15" y2="26" stroke="currentColor" strokeOpacity="0.3" />
      <line x1="27" y1="4" x2="27" y2="26" stroke="currentColor" strokeOpacity="0.3" />
    </svg>
  );
});

// ============================================================================
// Variant Preview Component
// ============================================================================

const VariantPreview = React.memo(function VariantPreview({ variant }: { variant: ChartVariant }) {
  const category = CHART_VARIANTS[variant].category;

  switch (category) {
    case 'area':
      return <MiniAreaChart variant={variant} />;
    case 'bar':
      return <MiniBarChart variant={variant} />;
    case 'line':
      return <MiniLineChart variant={variant} />;
    case 'pie':
      return <MiniPieChart variant={variant} />;
    case 'radar':
      return <MiniRadarChart variant={variant} />;
    case 'radial':
      return <MiniRadialChart variant={variant} />;
    case 'table':
      return <MiniTableChart />;
    default:
      return null;
  }
});

// ============================================================================
// Main Component
// ============================================================================

export function ChartSelector({
  value,
  onChange,
  children,
  disabled,
  triggerId,
}: ChartSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState<ChartCategory>(
    value ? CHART_VARIANTS[value].category : DEFAULT_CATEGORY,
  );

  const categories = React.useMemo(() => getAllCategories(), []);
  const variantsByCategory = React.useMemo(
    () => new Map(categories.map((category) => [category.id, getVariantsForCategory(category.id)])),
    [categories],
  );

  React.useEffect(() => {
    if (!value) return;
    setSelectedCategory(CHART_VARIANTS[value].category);
  }, [value]);

  const handleSelectVariant = React.useCallback(
    (variant: ChartVariant) => {
      const category = CHART_VARIANTS[variant].category;
      onChange?.(variant, category);
      setOpen(false);
    },
    [onChange],
  );

  const handleCategoryChange = React.useCallback((nextCategory: string) => {
    setSelectedCategory(nextCategory as ChartCategory);
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen && value) {
        setSelectedCategory(CHART_VARIANTS[value].category);
      }
    },
    [value],
  );

  const selectedVariant = value ? CHART_VARIANTS[value] : null;
  const CategoryIcon = selectedVariant
    ? CATEGORY_ICONS[selectedVariant.category]
    : DEFAULT_CATEGORY_ICON;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild disabled={disabled}>
        {children || (
          <Button
            id={triggerId}
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={disabled}
          >
            <CategoryIcon className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 text-left">
              {selectedVariant ? t(selectedVariant.name) : t('Select chart type')}
            </span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[600px] max-w-[1200px] sm:max-w-[1200px]">
        <DialogHeader>
          <DialogTitle>{t('Select Chart Type')}</DialogTitle>
          <DialogDescription>
            {t('Choose a chart type and style for your visualization')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="mt-4">
          <TabsList className="grid w-full grid-cols-7">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.id];
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex items-center gap-1.5"
                  aria-label={t(category.name)}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t(category.name)}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <ScrollArea className="h-[320px]">
                <div className="grid grid-cols-2 gap-4 pr-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(variantsByCategory.get(category.id) ?? []).map((variantConfig) => (
                    <button
                      key={variantConfig.id}
                      type="button"
                      onClick={() => handleSelectVariant(variantConfig.id)}
                      className={cn(
                        'group flex flex-col items-center rounded-lg border p-4 transition-all hover:border-primary hover:bg-accent',
                        value === variantConfig.id && 'border-primary bg-accent',
                      )}
                      aria-pressed={value === variantConfig.id}
                      aria-label={t(variantConfig.name)}
                    >
                      <div className="mb-2 h-12 w-full text-primary">
                        <VariantPreview variant={variantConfig.id} />
                      </div>
                      <span className="text-sm font-medium">{t(variantConfig.name)}</span>
                      <span className="mt-1 text-xs text-muted-foreground text-center line-clamp-2">
                        {t(variantConfig.description)}
                      </span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Inline Selector (for compact display)
// ============================================================================

export interface ChartTypeSelectorProps {
  /** Currently selected category */
  value?: ChartCategory;
  /** Callback when category is selected */
  onChange?: (category: ChartCategory) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Class name */
  className?: string;
}

export function ChartTypeSelector({
  value = 'bar',
  onChange,
  disabled,
  className,
}: ChartTypeSelectorProps) {
  const t = useTranslations();
  const categories = getAllCategories();

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category.id];
        return (
          <Button
            key={category.id}
            variant={value === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange?.(category.id)}
            disabled={disabled}
            className="gap-1.5"
            aria-pressed={value === category.id}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(category.name)}
          </Button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Variant Selector (for selecting variant within a category)
// ============================================================================

export interface ChartVariantSelectorProps {
  /** Chart category */
  category: ChartCategory;
  /** Currently selected variant */
  value?: ChartVariant;
  /** Callback when variant is selected */
  onChange?: (variant: ChartVariant) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Class name */
  className?: string;
  /** Optional aria-labelledby for group */
  ariaLabelledBy?: string;
}

export function ChartVariantSelector({
  category,
  value,
  onChange,
  disabled,
  className,
  ariaLabelledBy,
}: ChartVariantSelectorProps) {
  const t = useTranslations();
  const variants = getVariantsForCategory(category);

  return (
    <div
      className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}
      role="group"
      aria-labelledby={ariaLabelledBy}
    >
      {variants.map((variant) => (
        <button
          key={variant.id}
          type="button"
          onClick={() => onChange?.(variant.id)}
          disabled={disabled}
          className={cn(
            'flex flex-col items-center rounded-lg border p-3 transition-all hover:border-primary hover:bg-accent disabled:opacity-50',
            value === variant.id && 'border-primary bg-accent',
          )}
          aria-pressed={value === variant.id}
          aria-label={t(variant.name)}
        >
          <div className="mb-2 h-8 w-full text-primary">
            <VariantPreview variant={variant.id} />
          </div>
          <span className="text-xs font-medium">{t(variant.name)}</span>
        </button>
      ))}
    </div>
  );
}
