'use client';

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import type { ChartStyleConfig, CurveType } from '../types';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

export interface LineChartRendererProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  xKey: string;
  yKeys: string[];
  style?: ChartStyleConfig;
  className?: string;
}

export function LineChartRenderer({
  data,
  config,
  xKey,
  yKeys,
  style = {},
  className,
}: LineChartRendererProps) {
  const {
    showGrid = true,
    showTooltip = true,
    showLegend = false, // Default false like shadcn examples
    curveType = 'natural', // shadcn uses 'natural' by default
    showDots = false,
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

  return (
    <ChartContainer config={config} className={cn('h-full w-full', className)}>
      <LineChart data={data} accessibilityLayer margin={{ left: 12, right: 12 }}>
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

        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />}

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {yKeys.map((key) => (
          <Line
            key={key}
            dataKey={key}
            type={getCurveTypeValue(curveType)}
            stroke={`var(--color-${key})`}
            strokeWidth={2}
            dot={showDots ? { r: 4, fill: `var(--color-${key})` } : false}
            activeDot={{ r: 6 }}
            name={String(config[key]?.label || key)}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
