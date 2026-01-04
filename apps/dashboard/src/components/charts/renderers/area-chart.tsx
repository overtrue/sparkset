'use client';

import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartStyleConfig, CurveType } from '../types';

export interface AreaChartRendererProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  xKey: string;
  yKeys: string[];
  style?: ChartStyleConfig;
  className?: string;
}

export function AreaChartRenderer({
  data,
  config,
  xKey,
  yKeys,
  style = {},
  className,
}: AreaChartRendererProps) {
  const {
    showGrid = true,
    showTooltip = true,
    showLegend = true,
    stacked = false,
    curveType = 'natural',
    gradient = false,
  } = style;

  // Map curve type to recharts type - shadcn uses 'natural' for smooth curves
  const getCurveTypeValue = (type: CurveType): 'natural' | 'linear' | 'step' | 'monotone' => {
    switch (type) {
      case 'linear':
        return 'linear';
      case 'step':
        return 'step';
      case 'monotone':
        return 'monotone';
      case 'natural':
      default:
        return 'natural';
    }
  };

  // Stable chart ID for gradient references
  const chartId = useMemo(() => `area-chart-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <ChartContainer config={config} className={cn('h-full w-full', className)}>
      <AreaChart data={data} accessibilityLayer margin={{ left: 12, right: 12 }}>
        {/* Gradient definitions - following shadcn pattern */}
        {gradient && (
          <defs>
            {yKeys.map((key) => (
              <linearGradient key={key} id={`${chartId}-fill-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
        )}

        {showGrid && <CartesianGrid vertical={false} />}

        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) =>
            typeof value === 'string' && value.length > 3 ? value.slice(0, 3) : String(value)
          }
        />

        <YAxis tickLine={false} axisLine={false} tickMargin={8} />

        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent />} />}

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {yKeys.map((key) => (
          <Area
            key={key}
            dataKey={key}
            type={getCurveTypeValue(curveType)}
            fill={gradient ? `url(#${chartId}-fill-${key})` : `var(--color-${key})`}
            stroke={`var(--color-${key})`}
            fillOpacity={0.4}
            stackId={stacked ? 'stack' : undefined}
            name={String(config[key]?.label || key)}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
