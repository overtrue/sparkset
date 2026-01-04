'use client';

import { ChartRenderer } from '@/components/charts/renderer';
import type { ChartSpec } from '@/components/charts/types';
import { buildConfig, transformData } from '@/components/charts/utils';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { Link, useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import { RiArrowLeftLine, RiDeleteBin2Line, RiEditLine, RiRefreshLine } from '@remixicon/react';
import { use, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

interface ChartData {
  id: number;
  title: string;
  description?: string;
  chartType: 'area' | 'bar' | 'line' | 'pie' | 'radar' | 'radial' | 'table';
  specJson: ChartSpec;
  datasetId: number;
  dataset?: {
    name: string;
  };
  createdAt: string;
}

export default function ChartDetailPage({ params }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = Number(unwrappedParams.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [previewConfig, setPreviewConfig] = useState<ChartConfig>({});
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const chartResult = await chartsApi.get(id);
        setChartData(chartResult as ChartData);

        // Generate preview using shared utility functions
        if (chartResult.specJson && chartResult.datasetId) {
          const previewResult = await datasetsApi.preview(chartResult.datasetId);

          // Use shared transform and build functions
          const transformedData = transformData(previewResult.rows, chartResult.specJson);
          const config = buildConfig(chartResult.specJson);

          setPreviewData(transformedData);
          setPreviewConfig(config);
        }
      } catch {
        setError(t('Chart not found or inaccessible'));
      }
    };

    void loadData();
  }, [id]); // Remove 't' from dependencies to prevent infinite loop

  // Memoize rechartsProps to prevent unnecessary re-renders
  // Must be called at the top level (before any conditional returns)
  // Use stable dependencies to avoid unnecessary recalculations
  const nameKey =
    chartData?.specJson.encoding.category?.field || chartData?.specJson.encoding.x?.field;
  const dataKey = chartData?.specJson.encoding.y?.[0]?.field;
  const rechartsProps = useMemo(
    () => ({
      pieConfig: {
        nameKey,
        dataKey,
      },
    }),
    [nameKey, dataKey],
  );

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

      {/* Configuration info */}
      <div className="flex flex-wrap gap-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        <span>
          {t('Chart Type')}：
          <span className="font-medium text-foreground">{chartData.chartType}</span>
        </span>
        <span>
          {t('Dataset')}：
          <span className="font-medium text-foreground">
            {chartData.dataset?.name || chartData.datasetId}
          </span>
        </span>
        <span>
          {t('Created At')}：
          <span className="font-medium text-foreground">
            {new Date(chartData.createdAt).toLocaleDateString()}
          </span>
        </span>
      </div>

      {/* Chart display */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Live Preview')}</CardTitle>
          <CardDescription>
            {chartData.chartType.toUpperCase()} | {t('Dataset')}：{chartData.dataset?.name || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[600px]">
          <ChartRenderer
            chartType={chartData.chartType}
            variant={chartData.specJson.variant}
            data={previewData}
            config={previewConfig}
            style={chartData.specJson.style}
            rechartsProps={rechartsProps}
            className="h-full w-full"
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
