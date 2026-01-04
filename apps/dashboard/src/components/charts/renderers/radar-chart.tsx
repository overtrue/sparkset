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
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts';
import { cn } from '@/lib/utils';

export interface RadarChartRendererProps {
  data: Record<string, unknown>[];
  config: ChartConfig;
  categoryKey: string;
  valueKeys: string[];
  style?: ChartStyleConfig;
  className?: string;
}

export function RadarChartRenderer({
  data,
  config,
  categoryKey,
  valueKeys,
  style = {},
  className,
}: RadarChartRendererProps) {
  const {
    showTooltip = true,
    showLegend = false, // Default false like shadcn examples
    gridType = 'polygon', // 'polygon' or 'circle'
    fillOpacity = 0.6,
    showDots = false,
  } = style;

  return (
    <ChartContainer config={config} className={cn('mx-auto h-full w-full', className)}>
      <RadarChart data={data}>
        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent />} />}

        <PolarAngleAxis dataKey={categoryKey} />
        <PolarGrid gridType={gridType} />

        {showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {valueKeys.map((key) => (
          <Radar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            fillOpacity={fillOpacity}
            dot={showDots ? { r: 4, fillOpacity: 1 } : false}
            name={String(config[key]?.label || key)}
          />
        ))}
      </RadarChart>
    </ChartContainer>
  );
}
