'use client';

import { ChartRenderer } from '@/components/charts/renderer';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { Link, useRouter } from '@/i18n/client-routing';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import type { ChartSpec } from '@/types/chart';
import { RiArrowLeftLine, RiDeleteBin2Line, RiEditLine, RiRefreshLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// Helper: Transform data based on spec (same as ChartBuilder)
function transformData(
  rows: Record<string, unknown>[],
  spec: ChartSpec,
  chartType: string,
): unknown[] {
  if (chartType === 'table') {
    return rows;
  }

  if (chartType === 'pie' && spec.encoding?.x && spec.encoding?.y) {
    const xField = spec.encoding.x.field;
    const yFields = spec.encoding.y;

    const grouped: Record<string, Record<string, number>> = {};

    rows.forEach((row) => {
      const xValue = String(row[xField]);
      if (!grouped[xValue]) {
        grouped[xValue] = {};
      }

      yFields.forEach((yField) => {
        const value = Number(row[yField.field]) || 0;
        if (!grouped[xValue][yField.field]) {
          grouped[xValue][yField.field] = 0;
        }

        switch (yField.agg) {
          case 'sum':
            grouped[xValue][yField.field] += value;
            break;
          case 'count':
            grouped[xValue][yField.field] += 1;
            break;
          case 'min':
            if (!grouped[xValue][yField.field] || value < grouped[xValue][yField.field]) {
              grouped[xValue][yField.field] = value;
            }
            break;
          case 'max':
            if (value > grouped[xValue][yField.field]) {
              grouped[xValue][yField.field] = value;
            }
            break;
          case 'avg':
            if (!grouped[xValue][`${yField.field}_sum`]) {
              grouped[xValue][`${yField.field}_sum`] = 0;
              grouped[xValue][`${yField.field}_count`] = 0;
            }
            grouped[xValue][`${yField.field}_sum`] += value;
            grouped[xValue][`${yField.field}_count`] += 1;
            break;
        }
      });
    });

    return Object.entries(grouped).map(([xValue, values]) => {
      const result: Record<string, unknown> = { [xField]: xValue };

      if (spec.encoding?.y) {
        spec.encoding.y.forEach((yField) => {
          if (yField.agg === 'avg') {
            const sum = values[`${yField.field}_sum`] || 0;
            const count = values[`${yField.field}_count`] || 1;
            result[yField.field] = sum / count;
          } else {
            result[yField.field] = values[yField.field];
          }
        });
      }

      return result;
    });
  }

  return rows;
}

// Helper: Build chart config (same as ChartBuilder)
function buildConfig(spec: ChartSpec): ChartConfig {
  const config: ChartConfig = {};

  if (spec.encoding?.y) {
    spec.encoding.y.forEach((yField) => {
      config[yField.field] = {
        label: yField.label || yField.field,
        color: yField.color || 'var(--chart-1)',
      };
    });
  }

  return config;
}

export default function ChartDetailPage({ params }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = Number(unwrappedParams.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any>(null);
  const [previewData, setPreviewData] = useState<unknown[]>([]);
  const [previewConfig, setPreviewConfig] = useState<ChartConfig>({});
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const chartResult = await chartsApi.get(id);
        setChartData(chartResult);

        // Generate preview using same logic as ChartBuilder
        if (chartResult.specJson && chartResult.datasetId) {
          const previewResult = await datasetsApi.preview(chartResult.datasetId);
          const transformedData = transformData(
            previewResult.rows,
            chartResult.specJson,
            chartResult.chartType,
          );
          const config = buildConfig(chartResult.specJson);

          setPreviewData(transformedData);
          setPreviewConfig(config);
        }
      } catch {
        setError(t('Chart not found or inaccessible'));
      }
    };

    void loadData();
  }, [id, t]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await chartsApi.delete(id);
      toast.success(t('Chart deleted'));
      router.push('/dashboard/charts');
    } catch {
      toast.error(t('Delete failed'));
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('Chart not found')} description="" />
        <Card>
          <CardHeader>
            <CardTitle>{t('Chart not found')}</CardTitle>
            <CardDescription>
              {t('The chart may have been deleted or you do not have access')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/charts">
                <RiArrowLeftLine className="h-4 w-4" />
                {t('Back to list')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chartData || previewData.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('Loading...')} description="" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={chartData.title}
        backButton="/dashboard/charts"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/charts/${id}/edit`}>
                <RiEditLine className="h-4 w-4" />
                {t('Edit')}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/charts/new" className="flex items-center">
                <RiRefreshLine className="h-4 w-4" />
                {t('Create from this')}
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <RiDeleteBin2Line className="h-4 w-4" />
              {t('Delete')}
            </Button>
          </div>
        }
      />

      {/* Configuration info - single line display */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <span>
          {t('Chart Type')}：
          <span className="text-foreground font-medium">{chartData.chartType}</span>
        </span>
        <span>
          {t('Dataset')}：
          <span className="text-foreground font-medium">
            {chartData.dataset?.name || chartData.datasetId}
          </span>
        </span>
        <span>
          {t('Created At')}：
          <span className="text-foreground font-medium">
            {new Date(chartData.createdAt).toLocaleDateString()}
          </span>
        </span>
      </div>

      {/* Chart display - using ChartRenderer with same data processing logic as edit page */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Live Preview')}</CardTitle>
          <CardDescription>
            {chartData.chartType.toUpperCase()} | {t('Dataset')}：{chartData.dataset?.name || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartRenderer
            chartType={chartData.chartType}
            data={previewData}
            config={previewConfig}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('Delete Chart')}
        description={t(`Are you sure to delete chart '{title}'? This action cannot be undone`, {
          title: chartData.title,
        })}
        confirmText={t('Delete')}
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}
