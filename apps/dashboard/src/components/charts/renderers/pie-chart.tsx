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
import { Cell, Pie, PieChart } from 'recharts';
import { getChartColor } from '../types';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface PieChartRendererProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  nameKey: string;
  valueKey: string;
  style?: ChartStyleConfig;
  className?: string;
}

export function PieChartRenderer({
  data,
  config,
  nameKey,
  valueKey,
  style = {},
  className,
}: PieChartRendererProps) {
  const {
    showTooltip = true,
    showLegend = false, // Default false like shadcn examples
    innerRadius: rawInnerRadius = 0,
    outerRadius: rawOuterRadius = 80,
    paddingAngle = 0,
    showLabels = false,
  } = style;

  // Convert values to percentage strings for better responsiveness
  const innerRadius = rawInnerRadius > 0 ? `${Math.min(rawInnerRadius, 100)}%` : 0;
  const outerRadius = `${Math.min(rawOuterRadius, 100)}%`;

  // Enrich data with fill colors following shadcn pattern
  const enrichedData = useMemo(() => enrichPieData(data, config, nameKey), [data, config, nameKey]);

  // Custom label renderer for pie slices
  const renderLabel = showLabels
    ? ({
        cx,
        cy,
        midAngle,
        innerRadius: ir,
        outerRadius: or,
        percent,
      }: {
        cx: number;
        cy: number;
        midAngle: number;
        innerRadius: number;
        outerRadius: number;
        percent: number;
      }) => {
        const RADIAN = Math.PI / 180;
        const radius = ir + (or - ir) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
          <text
            x={x}
            y={y}
            fill="white"
            textAnchor={x > cx ? 'start' : 'end'}
            dominantBaseline="central"
            fontSize={12}
          >
            {`${(percent * 100).toFixed(0)}%`}
          </text>
        );
      }
    : undefined;

  return (
    <ChartContainer config={config} className={cn('mx-auto h-full w-full', className)}>
      <PieChart>
        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />}

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        <Pie
          data={enrichedData}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={paddingAngle}
          label={renderLabel}
          labelLine={false}
          strokeWidth={5}
        >
          {enrichedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={(entry.fill as string) || getChartColor(index)} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
