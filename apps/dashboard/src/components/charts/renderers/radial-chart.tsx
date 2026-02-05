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
import { Cell, PolarGrid, RadialBar, RadialBarChart } from 'recharts';
import type { ChartStyleConfig } from '../types';
import { getChartColor } from '../types';
import { enrichPieData } from '../utils';

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
    showLegend = false,
    showGrid = false,
    innerRadius: rawInnerRadius = 30,
    outerRadius: rawOuterRadius = 80,
    startAngle = 90,
    endAngle = -270,
    showLabels = false,
  } = style;

  const innerRadius = rawInnerRadius > 0 ? `${Math.min(rawInnerRadius, 100)}%` : 0;
  const outerRadius = `${Math.min(rawOuterRadius, 100)}%`;

  const enrichedData = useMemo(() => {
    const enriched = enrichPieData(data, config, nameKey);
    return enriched.map((entry) => {
      const value = entry[valueKey];
      const numValue = typeof value === 'number' ? value : Number(value);
      const nameValue = entry[nameKey];
      const formattedName =
        typeof nameValue === 'string' ||
        typeof nameValue === 'number' ||
        typeof nameValue === 'boolean'
          ? String(nameValue)
          : '';

      return {
        ...entry,
        [nameKey]: formattedName,
        [valueKey]: Number.isFinite(numValue) ? numValue : 0,
      };
    });
  }, [data, config, nameKey, valueKey]);

  const legendPayload = useMemo(
    () =>
      enrichedData.map((entry, index) => {
        const fillColor = (entry.fill as string) || getChartColor(index);
        return {
          value: entry[nameKey],
          type: 'rect' as const,
          color: fillColor,
          dataKey: nameKey,
          payload: entry,
        };
      }),
    [enrichedData, nameKey],
  );

  return (
    <ChartContainer config={config} className={cn('h-full w-full', className)}>
      <RadialBarChart
        data={enrichedData}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        cx="50%"
        cy="50%"
      >
        {showGrid && <PolarGrid />}

        {showTooltip && (
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey={nameKey} />}
          />
        )}

        {showLegend && (
          <ChartLegend payload={legendPayload} content={<ChartLegendContent nameKey={nameKey} />} />
        )}

        <RadialBar
          dataKey={valueKey}
          cornerRadius={4}
          background={{ fill: 'transparent' }}
          label={showLabels}
          isAnimationActive={false}
        >
          {enrichedData.map((entry, index) => {
            const fillColor = (entry.fill as string) || getChartColor(index);
            return <Cell key={`cell-${index}`} fill={fillColor} />;
          })}
        </RadialBar>
      </RadialBarChart>
    </ChartContainer>
  );
}
