'use client';

import { ChartFrame, ChartRenderer } from '@/components/charts/renderer';
import type { ChartSpec } from '@/components/charts/types';
import { buildConfig, transformData } from '@/components/charts/utils';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { Link, useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { deleteChart, fetchChartById } from '@/lib/api/charts';
import { previewDataset } from '@/lib/api/datasets';
import { RiArrowLeftLine, RiDeleteBin2Line, RiEditLine, RiRefreshLine } from '@remixicon/react';
import { use, useEffect, useState } from 'react';
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
        const chartResult = await fetchChartById(id);
        setChartData(chartResult as ChartData);

        // Generate preview using shared utility functions
        if (chartResult.specJson && chartResult.datasetId) {
          const previewResult = await previewDataset(chartResult.datasetId);

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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteChart(id);
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
                <RiArrowLeftLine className="h-4 w-4" aria-hidden="true" />
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
        <PageHeader title={t('Loading…')} description="" />
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
                <RiEditLine className="h-4 w-4" aria-hidden="true" />
                {t('Edit')}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/charts/new" className="flex items-center">
                <RiRefreshLine className="h-4 w-4" aria-hidden="true" />
                {t('Create From This')}
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <RiDeleteBin2Line className="h-4 w-4" aria-hidden="true" />
              {t('Delete')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Basic info */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t('Basic Information')}</CardTitle>
            <CardDescription>{chartData.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('Chart Type')}</p>
              <p className="font-medium">{chartData.chartType.toUpperCase()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('Dataset')}</p>
              <p className="font-medium">{chartData.dataset?.name || chartData.datasetId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('Created At')}</p>
              <p className="font-medium">{new Date(chartData.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Chart display */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Live Preview')}</CardTitle>
            <CardDescription>
              {chartData.chartType.toUpperCase()} | {t('Dataset')}：
              {chartData.dataset?.name || 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartFrame chartType={chartData.chartType}>
              <ChartRenderer
                chartType={chartData.chartType}
                variant={chartData.specJson.variant}
                data={previewData}
                config={previewConfig}
                style={chartData.specJson.style}
                className="h-full w-full"
              />
            </ChartFrame>
          </CardContent>
        </Card>
      </div>

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
