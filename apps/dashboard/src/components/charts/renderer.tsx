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
    const valueKey = Object.keys(config)[0] || 'value';
    const nameKey = Object.keys(chartData[0] || {}).find((k) => k !== valueKey) || 'name';

    return (
      <ChartContainer config={config} className={className}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart {...rechartsProps}>
            <Tooltip content={<ChartTooltipContent hideLabel />} />
            <Legend content={<ChartLegendContent />} />
            <Pie
              data={chartData}
              dataKey={valueKey}
              nameKey={nameKey}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              cx="50%"
              cy="50%"
              {...rechartsProps}
            >
              {chartData.map((entry, index) => {
                const key = Object.keys(config)[index % Object.keys(config).length];
                const color = config[key]?.color || '#8884d8';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
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

// Helper component for pie chart cells
function Cell({ fill, ...props }: { fill: string } & React.SVGProps<SVGRectElement>) {
  return <rect {...props} fill={fill} />;
}
