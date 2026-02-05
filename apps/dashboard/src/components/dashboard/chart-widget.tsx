'use client';

import { ChartRenderer } from '@/components/charts/renderer';
import type { ChartCategory, ChartStyleConfig, ChartVariant } from '@/components/charts/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { renderChart } from '@/lib/api/charts';
import type { ChartWidgetConfig } from '@/types/dashboard';
import { useTranslations } from '@/i18n/use-translations';
import { useEffect, useState } from 'react';

interface ChartRenderResult {
  chartType: ChartCategory;
  variant?: ChartVariant;
  data: unknown[];
  config: ChartConfig;
  style?: ChartStyleConfig;
  warnings?: string[];
}

interface ChartWidgetProps {
  config: ChartWidgetConfig;
  refreshKey?: number;
}

export function ChartWidget({ config, refreshKey }: ChartWidgetProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartRenderResult | null>(null);

  const loadChart = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await renderChart(config.chartId, false);
      setChartData(result as ChartRenderResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load chart'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChart();
  }, [config.chartId, refreshKey]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-4">
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
      <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
        {t('No data')}
      </div>
    );
  }

  return (
    <div className="h-full w-full p-2">
      <ChartRenderer
        chartType={chartData.chartType}
        variant={chartData.variant}
        data={chartData.data}
        config={chartData.config}
        style={chartData.style}
        className="h-full w-full"
      />
    </div>
  );
}
