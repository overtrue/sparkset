'use client';

import { useEffect, useState } from 'react';
import { ChartRenderer } from '@/components/charts/renderer';
import type { ChartRenderResult } from '@/types/chart';
import { chartsApi } from '@/lib/api/charts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChartWidgetConfig } from '@/types/dashboard';

interface ChartWidgetProps {
  config: ChartWidgetConfig;
  refreshKey?: number; // 当这个 key 变化时，会重新加载数据
}

export function ChartWidget({ config, refreshKey }: ChartWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartRenderResult | null>(null);

  const loadChart = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await chartsApi.render(config.chartId, false);
      setChartData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载图表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.chartId, refreshKey]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!chartData) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4">
      <ChartRenderer
        chartType={chartData.chartType}
        data={chartData.data}
        config={chartData.config}
        rechartsProps={chartData.rechartsProps}
        className="h-full"
      />
    </div>
  );
}
