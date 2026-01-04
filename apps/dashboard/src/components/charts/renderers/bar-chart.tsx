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
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartStyleConfig } from '../types';

export interface BarChartRendererProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  xKey: string;
  yKeys: string[];
  style?: ChartStyleConfig;
  className?: string;
}

export function BarChartRenderer({
  data,
  config,
  xKey,
  yKeys,
  style = {},
  className,
}: BarChartRendererProps) {
  const {
    showGrid = true,
    showTooltip = true,
    showLegend = true,
    stacked = false,
    horizontal = false,
  } = style;

  // Horizontal bar chart (shadcn style)
  if (horizontal) {
    return (
      <ChartContainer config={config} className={cn('h-full w-full', className)}>
        <BarChart data={data} layout="vertical" margin={{ left: -20 }} accessibilityLayer>
          {showGrid && <CartesianGrid horizontal={false} />}

          {/* XAxis: numeric values (hidden as per shadcn example) */}
          <XAxis type="number" hide />

          {/* YAxis: category labels */}
          <YAxis
            dataKey={xKey}
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) =>
              typeof value === 'string' && value.length > 10
                ? value.slice(0, 10) + '...'
                : String(value)
            }
            width={100}
          />

          {showTooltip && (
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          )}

          {showLegend && <ChartLegend content={<ChartLegendContent />} />}

          {yKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={`var(--color-${key})`}
              radius={5}
              stackId={stacked ? 'stack' : undefined}
              name={String(config[key]?.label || key)}
            />
          ))}
        </BarChart>
      </ChartContainer>
    );
  }

  // Vertical bar chart (default)
  return (
    <ChartContainer config={config} className={cn('h-full w-full', className)}>
      <BarChart data={data} accessibilityLayer>
        {showGrid && <CartesianGrid vertical={false} />}

        <XAxis
          dataKey={xKey}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) =>
            typeof value === 'string' && value.length > 3 ? value.slice(0, 3) : String(value)
          }
        />

        <YAxis tickLine={false} axisLine={false} tickMargin={8} />

        {showTooltip && <ChartTooltip content={<ChartTooltipContent />} />}

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {yKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            radius={stacked && index < yKeys.length - 1 ? 0 : 4}
            stackId={stacked ? 'stack' : undefined}
            name={String(config[key]?.label || key)}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
