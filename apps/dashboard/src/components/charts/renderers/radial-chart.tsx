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
    showLegend = false, // Default false like shadcn examples
    showGrid = false,
    innerRadius: rawInnerRadius = 30,
    outerRadius: rawOuterRadius = 110,
    startAngle = 90,
    endAngle = -270,
  } = style;

  // Convert to numbers for Recharts RadialBarChart
  // Recharts expects numbers (pixels), not percentage strings
  // Use the raw values directly, but ensure they're reasonable
  // For radial charts, outerRadius should be larger to fill the container
  const innerRadius = rawInnerRadius;
  const outerRadius = rawOuterRadius;

  // Enrich data with fill colors following shadcn pattern
  // Also ensure all numeric values are properly converted to numbers
  const enrichedData = useMemo(() => {
    const enriched = enrichPieData(data, config, nameKey);
    // Ensure valueKey is a number for RadialBarChart
    // Also ensure nameKey is a string for proper label display
    return enriched.map((entry) => {
      const value = entry[valueKey];
      const numValue = typeof value === 'number' ? value : Number(value);
      const finalValue = isNaN(numValue) ? 0 : numValue;

      // Safely convert nameKey value to string
      const nameValue = entry[nameKey];
      const nameString =
        nameValue == null
          ? ''
          : typeof nameValue === 'string'
            ? nameValue
            : typeof nameValue === 'number' || typeof nameValue === 'boolean'
              ? String(nameValue)
              : '';

      return {
        ...entry,
        [nameKey]: nameString,
        [valueKey]: finalValue,
      };
    });
  }, [data, config, nameKey, valueKey]);

  return (
    <ChartContainer config={config} className={cn('mx-auto h-full w-full', className)}>
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

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        <RadialBar
          dataKey={valueKey}
          cornerRadius={4}
          background={{ fill: 'transparent' }}
          label={false}
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
