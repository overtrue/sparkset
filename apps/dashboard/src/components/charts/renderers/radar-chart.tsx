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
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from 'recharts';
import type { ChartStyleConfig } from '../types';

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

  // Debug: Log categoryKey and first data item to verify structure
   
  if (process.env.NODE_ENV === 'development' && data.length > 0) {
     
    console.log('[RadarChart] categoryKey:', categoryKey, 'data[0]:', data[0], 'all data:', data);
     
    console.log(
      '[RadarChart] category values:',
      data.map((d) => d[categoryKey]),
    );
  }

  return (
    <ChartContainer config={config} className={cn('mx-auto h-full w-full', className)}>
      <RadarChart data={data}>
        {showTooltip && <ChartTooltip cursor={false} content={<ChartTooltipContent />} />}

        <PolarAngleAxis
          dataKey={categoryKey}
          tickFormatter={(value) => {
            // Ensure value is displayed as string, not number
            // This is critical for radar charts where category labels should be text
            // Even if the underlying data is numeric, convert it to string for display
            if (value === null || value === undefined) {
              return '';
            }
            // Force string conversion to prevent Recharts from displaying numbers
            const stringValue = String(value);
            // If the string is a pure number (e.g., "1", "2"), we still want to display it as-is
            // The issue might be that Recharts is parsing it back to a number
            // So we add a non-breaking space or ensure it's treated as text
            return stringValue;
          }}
        />
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
