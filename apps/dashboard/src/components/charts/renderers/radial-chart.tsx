'use client';

import type { ChartConfig } from '@/components/ui/chart';
import {
  ChartContainer,
  ChartContext,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    outerRadius: rawOuterRadius = 80, // Use percentage (80% of container)
    startAngle = 90,
    endAngle = -270,
  } = style;

  // Convert to numbers for Recharts RadialBarChart
  // Recharts expects numbers (pixels), not percentage strings
  // Calculate radius based on chart container size (not including legend) for accurate sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartContainerSize, setChartContainerSize] = useState({ width: 400, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      // Measure the chart container, not the entire container (which includes legend)
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        const size = Math.min(width, height);
        setChartContainerSize({ width: size, height: size });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [showLegend]); // Re-measure when legend visibility changes

  // Calculate radius as percentage of chart container size (excluding legend)
  // Values 0-100 are treated as percentage, values > 100 are treated as pixels
  const minSize = Math.min(chartContainerSize.width, chartContainerSize.height);
  // Default to percentage calculation (0-100 range)
  // If value > 100, treat as absolute pixels; otherwise as percentage
  const innerRadius =
    rawInnerRadius > 100 ? rawInnerRadius : (rawInnerRadius / 100) * (minSize / 2);
  const outerRadius =
    rawOuterRadius > 100 ? rawOuterRadius : (rawOuterRadius / 100) * (minSize / 2);

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
    <div ref={containerRef} className={cn('mx-auto flex h-full w-full flex-col', className)}>
      <div
        className={cn('flex w-full flex-col', showLegend ? 'flex-1 min-h-0' : 'h-full')}
        style={showLegend ? { minHeight: 0, overflow: 'hidden' } : { height: '100%' }}
      >
        <div
          ref={chartContainerRef}
          className={cn('w-full', showLegend ? 'flex-1 min-h-0' : 'h-full')}
          style={showLegend ? { minHeight: 0 } : { height: '100%' }}
        >
          <ChartContainer config={config} className="w-full h-full">
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

              <RadialBar
                dataKey={valueKey}
                cornerRadius={4}
                background={{ fill: 'transparent' }}
                label={false}
                isAnimationActive={false}
              >
                {enrichedData.map((entry, index) => {
                  const fillColor = (entry.fill as string) || getChartColor(index);
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </RadialBar>
            </RadialBarChart>
          </ChartContainer>
        </div>
        {showLegend && (
          <div
            className="shrink-0 relative w-full"
            style={{
              minHeight: '44px',
              paddingTop: '8px',
              paddingBottom: '8px',
              marginTop: '8px',
            }}
          >
            {/* Provide ChartContext manually for legend without ResponsiveContainer */}
            <ChartContext.Provider value={{ config }}>
              <div
                className="w-full"
                style={{
                  position: 'relative',
                  width: '100%',
                }}
              >
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                      .recharts-legend-wrapper {
                        position: relative !important;
                        left: auto !important;
                        transform: none !important;
                        bottom: auto !important;
                        width: 100% !important;
                        right: auto !important;
                        max-width: 100% !important;
                      }
                    `,
                  }}
                />
                <ChartLegend
                  content={() => {
                    // For RadialBarChart, create custom payload from data
                    const customPayload = enrichedData.map((entry, index) => {
                      const fillColor = (entry.fill as string) || getChartColor(index);
                      const nameValue = entry[nameKey];
                      const entryName =
                        nameValue == null
                          ? ''
                          : typeof nameValue === 'string'
                            ? nameValue
                            : typeof nameValue === 'number' || typeof nameValue === 'boolean'
                              ? String(nameValue)
                              : '';
                      return {
                        value: entryName,
                        type: 'radialBar' as const,
                        id: `legend-${index}`,
                        color: fillColor,
                        dataKey: nameKey,
                        payload: entry,
                      };
                    });
                    return (
                      <ChartLegendContent
                        nameKey={nameKey}
                        payload={
                          customPayload as unknown as Parameters<
                            typeof ChartLegendContent
                          >[0]['payload']
                        }
                      />
                    );
                  }}
                />
              </div>
            </ChartContext.Provider>
          </div>
        )}
      </div>
    </div>
  );
}
