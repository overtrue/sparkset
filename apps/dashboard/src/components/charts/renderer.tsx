'use client';

import * as React from 'react';
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Line,
  Bar,
  Area,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ChartConfig } from '@/components/ui/chart';

export interface ChartRendererProps {
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
  data: unknown[];
  config: ChartConfig;
  rechartsProps?: Record<string, unknown>;
  className?: string;
}

const formatTableValue = (value: unknown): string => {
  if (value == null) {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
};

export function ChartRenderer({
  chartType,
  data,
  config,
  rechartsProps = {},
  className,
}: ChartRendererProps) {
  const chartData = data as Record<string, unknown>[];

  // Render table
  if (chartType === 'table') {
    if (!chartData || chartData.length === 0) {
      return <div className="text-muted-foreground text-sm p-4">暂无数据</div>;
    }

    const columns = Object.keys(chartData[0] || {});

    return (
      <div className={className}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((row, idx) => (
              <TableRow key={idx}>
                {columns.map((col) => (
                  <TableCell key={col}>{formatTableValue(row[col])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Render pie chart
  if (chartType === 'pie') {
    // Extract pie-specific props from rechartsProps
    const { pieConfig, data, margin, ...restProps } = rechartsProps;
    const pieProps = (pieConfig as Record<string, unknown>) || {};
    const typedMargin = margin as Record<string, number> | undefined;

    // Determine data and config keys
    const chartDataArray = (data || chartData) as Record<string, unknown>[];
    const configKeys = Object.keys(config);

    // Get the value key from config (first key)
    const valueKey = configKeys[0] || 'value';

    // Try to find the name key from data (any field that's not the value key)
    const dataKeys = chartDataArray.length > 0 ? Object.keys(chartDataArray[0]) : [];
    const nameKey =
      (typeof pieProps.nameKey === 'string' ? pieProps.nameKey : undefined) ||
      dataKeys.find((k) => k !== valueKey) ||
      'name';

    // Enrich data with fill colors from config (following shadcn/ui pattern)
    const enrichedData = chartDataArray.map((entry, index) => {
      const entryName = entry[nameKey as keyof typeof entry];
      const configKey = configKeys.find((k) => config[k].label === entryName);

      // Get color from config.color, fallback to CSS variables
      let fillColor: string;
      if (configKey && config[configKey].color) {
        fillColor = config[configKey].color;
      } else {
        // Fallback to default CSS variables
        fillColor = `var(--chart-${(index % 5) + 1})`;
      }

      // Add fill property to data entry (following official shadcn/ui pattern)
      return {
        ...entry,
        fill: fillColor,
      };
    });

    // Build legend payload from enriched data
    const legendPayload = enrichedData.map((entry) => ({
      value: String((entry as Record<string, unknown>)[nameKey as string]),
      color: entry.fill,
    }));

    return (
      <ChartContainer config={config} className={className}>
        <PieChart data={enrichedData} margin={typedMargin} {...restProps}>
          <Tooltip content={<ChartTooltipContent hideLabel />} />
          <Legend
            content={() => (
              <div className="flex items-center justify-center gap-4 pt-3">
                {legendPayload.map((item, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{String(item.value)}</span>
                  </div>
                ))}
              </div>
            )}
          />
          <Pie
            data={enrichedData}
            dataKey={(pieProps.dataKey as string | undefined) || valueKey}
            nameKey={nameKey}
            innerRadius={(pieProps.innerRadius as number | undefined) ?? 60}
            outerRadius={(pieProps.outerRadius as number | undefined) ?? 80}
            paddingAngle={(pieProps.paddingAngle as number | undefined) ?? 5}
            cx="50%"
            cy="50%"
            isAnimationActive={(pieProps.isAnimationActive as boolean | undefined) ?? true}
          />
        </PieChart>
      </ChartContainer>
    );
  }

  // Render line, bar, area charts
  const xKey = Object.keys(chartData[0] || {})[0];
  const yKeys = Object.keys(config);

  return (
    <ChartContainer config={config} className={className}>
      {chartType === 'line' ? (
        <LineChart data={chartData} {...rechartsProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          {yKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={config[key]?.color || `hsl(var(--primary))`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={String(config[key]?.label || key)}
              {...rechartsProps}
            />
          ))}
        </LineChart>
      ) : chartType === 'bar' ? (
        <BarChart data={chartData} {...rechartsProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          {yKeys.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              fill={config[key]?.color || `hsl(var(--primary))`}
              radius={[4, 4, 0, 0]}
              name={String(config[key]?.label || key)}
              {...rechartsProps}
            />
          ))}
        </BarChart>
      ) : (
        <AreaChart data={chartData} {...rechartsProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend content={<ChartLegendContent />} />
          {yKeys.map((key) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              fill={config[key]?.color || `hsl(var(--primary))`}
              stroke={config[key]?.color || `hsl(var(--primary))`}
              fillOpacity={0.3}
              name={String(config[key]?.label || key)}
              {...rechartsProps}
            />
          ))}
        </AreaChart>
      )}
    </ChartContainer>
  );
}
