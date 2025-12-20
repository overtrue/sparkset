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
  Cell as RechartsCell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
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
                  <TableCell key={col}>
                    {typeof row[col] === 'number'
                      ? (row[col] as number).toLocaleString()
                      : String(row[col] ?? '-')}
                  </TableCell>
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
    const { pieConfig, data, margin, showLegend, ...restProps } = rechartsProps as any;
    const pieProps = pieConfig || {};

    // Determine data and config keys
    const chartDataArray = (data || chartData) as Record<string, unknown>[];
    const configKeys = Object.keys(config);

    // Get the value key from config (first key)
    const valueKey = configKeys[0] || 'value';

    // Try to find the name key from data (any field that's not the value key)
    const dataKeys = chartDataArray.length > 0 ? Object.keys(chartDataArray[0]) : [];
    const nameKey = pieProps.nameKey || dataKeys.find((k) => k !== valueKey) || 'name';

    // Build a custom legend payload for pie chart
    // Each entry in data becomes a legend item
    const legendPayload = chartDataArray.map((entry, index) => {
      const entryName = entry[nameKey];
      // Find config key that matches the entry name or use index
      const configKey =
        configKeys.find((k) => config[k].label === entryName) ||
        configKeys[index % configKeys.length];
      const color = config[configKey]?.color || '#8884d8';

      return {
        value: entryName,
        color: color,
        type: 'square' as const,
      };
    });

    // Build cells with proper colors matching config
    const cells = chartDataArray.map((entry, index) => {
      const entryName = entry[nameKey];
      // Find config key that matches the entry name or use index
      const configKey =
        configKeys.find((k) => config[k].label === entryName) ||
        configKeys[index % configKeys.length];
      const color = config[configKey]?.color || '#8884d8';
      return <RechartsCell key={`cell-${index}`} fill={color} />;
    });

    return (
      <ChartContainer config={config} className={className}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart data={chartDataArray} margin={margin} {...restProps}>
            <Tooltip content={<ChartTooltipContent hideLabel />} />
            <Legend
              content={({ payload }) => {
                if (!payload) return null;
                // Merge our custom payload with the one from Recharts
                const mergedPayload = legendPayload.map((item, index) => ({
                  ...payload[index],
                  ...item,
                }));
                return <ChartLegendContent payload={mergedPayload} />;
              }}
            />
            <Pie
              data={chartDataArray}
              dataKey={pieProps.dataKey || valueKey}
              nameKey={pieProps.nameKey || nameKey}
              innerRadius={pieProps.innerRadius ?? 60}
              outerRadius={pieProps.outerRadius ?? 80}
              paddingAngle={pieProps.paddingAngle ?? 5}
              cx="50%"
              cy="50%"
              isAnimationActive={pieProps.isAnimationActive ?? true}
            >
              {cells}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
  }

  // Render line, bar, area charts
  const xKey = Object.keys(chartData[0] || {})[0];
  const yKeys = Object.keys(config);

  return (
    <ChartContainer config={config} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'line' ? (
          <LineChart data={chartData} {...rechartsProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend content={<ChartLegendContent />} />
            {yKeys.map((key, idx) => (
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
            {yKeys.map((key, idx) => (
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
            {yKeys.map((key, idx) => (
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
      </ResponsiveContainer>
    </ChartContainer>
  );
}
