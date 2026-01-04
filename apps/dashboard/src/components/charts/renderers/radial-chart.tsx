'use client';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { ChartStyleConfig } from '../types';
import { enrichPieData } from '../utils';
import { Cell, PolarGrid, RadialBar, RadialBarChart } from 'recharts';
import { getChartColor } from '../types';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface RadialChartRendererProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  nameKey: string;
  valueKey: string;
  style?: ChartStyleConfig;
  className?: string;
}

export function RadialChartRenderer({
  data,
  config,
  nameKey,
  valueKey,
  style = {},
  className,
}: RadialChartRendererProps) {
  const {
    showTooltip = true,
    showLegend = false, // Default false like shadcn examples
    showGrid = false,
    innerRadius: rawInnerRadius = 30,
    outerRadius: rawOuterRadius = 110,
    showLabels = false,
  } = style;

  // Convert to percentage for better responsiveness
  const innerRadius = `${Math.min(rawInnerRadius, 100) * 0.4}%`;
  const outerRadius = `${Math.min(rawOuterRadius, 110)}%`;

  // Enrich data with fill colors following shadcn pattern
  const enrichedData = useMemo(() => enrichPieData(data, config, nameKey), [data, config, nameKey]);

  return (
    <ChartContainer config={config} className={cn('mx-auto h-full w-full', className)}>
      <RadialBarChart data={enrichedData} innerRadius={innerRadius} outerRadius={outerRadius}>
        {showGrid && <PolarGrid />}

        {showTooltip && (
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey={nameKey} />}
          />
        )}

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        <RadialBar
          dataKey={valueKey}
          background
          label={
            showLabels
              ? {
                  position: 'insideStart',
                  fill: '#fff',
                  fontSize: 12,
                }
              : undefined
          }
        >
          {enrichedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={(entry.fill as string) || getChartColor(index)} />
          ))}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  );
}
