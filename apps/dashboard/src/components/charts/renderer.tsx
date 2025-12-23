'use client';

import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from 'next-intl';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  const t = useTranslations();

  // Render table
  if (chartType === 'table') {
    if (!chartData || chartData.length === 0) {
      return <div className="text-muted-foreground text-sm p-4">{t('No data')}</div>;
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
                      ? row[col].toLocaleString()
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

    // Enrich data with fill colors from config (following shadcn/ui pattern)
    const enrichedData = chartDataArray.map((entry, index) => {
      const entryName = entry[nameKey];
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
      value: entry[nameKey as keyof typeof entry],
      color: entry.fill,
    }));

    return (
      <ChartContainer config={config} className={className}>
        <PieChart data={enrichedData} margin={margin} {...restProps}>
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
                    <span className="text-muted-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          />
          <Pie
            data={enrichedData}
            dataKey={pieProps.dataKey || valueKey}
            nameKey={pieProps.nameKey || nameKey}
            innerRadius={pieProps.innerRadius ?? 60}
            outerRadius={pieProps.outerRadius ?? 80}
            paddingAngle={pieProps.paddingAngle ?? 5}
            cx="50%"
            cy="50%"
            isAnimationActive={pieProps.isAnimationActive ?? true}
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
    </ChartContainer>
  );
}
