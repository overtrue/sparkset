'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { chartsApi } from '@/lib/api/charts';
import type { Chart, Dataset } from '@/types/chart';
import {
  RiAddLine,
  RiBarChartLine,
  RiDeleteBin2Line,
  RiEditLine,
  RiEyeLine,
  RiLineChartLine,
  RiPieChartLine,
  RiTableLine,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

interface ChartListProps {
  charts: Chart[];
  datasets: Dataset[];
  onRefresh?: () => void;
}

// Chart list component compatible with old interface, for code still referencing `@/components/charts/list`.
export function ChartList({ charts, datasets, onRefresh }: ChartListProps) {
  const router = useRouter();
  const t = useTranslations();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [chartToDelete, setChartToDelete] = React.useState<Chart | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const getDatasetName = (datasetId: number) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    return dataset?.name || t('Unknown Dataset');
  };

  const getChartIcon = (chartType: Chart['chartType']) => {
    const props = { className: 'h-5 w-5' };
    switch (chartType) {
      case 'line':
        return <RiLineChartLine {...props} />;
      case 'bar':
        return <RiBarChartLine {...props} />;
      case 'area':
        return <RiLineChartLine {...props} />;
      case 'pie':
        return <RiPieChartLine {...props} />;
      case 'table':
        return <RiTableLine {...props} />;
      default:
        return <RiBarChartLine {...props} />;
    }
  };

  const getChartBadgeVariant = (chartType: Chart['chartType']) => {
    switch (chartType) {
      case 'line':
        return 'default';
      case 'bar':
        return 'secondary';
      case 'area':
        return 'outline';
      case 'pie':
        return 'destructive';
      case 'table':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleDeleteClick = (chart: Chart) => {
    setChartToDelete(chart);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chartToDelete) return;

    try {
      setIsDeleting(true);
      await chartsApi.delete(chartToDelete.id);
      toast.success(t('Chart deleted'));
      setDeleteDialogOpen(false);
      setChartToDelete(null);
      onRefresh?.();
    } catch (error) {
      toast.error(t('Delete failed'));
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString('zh-CN');
  };

  if (charts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <RiBarChartLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{t('No Charts')}</CardTitle>
          <CardDescription>
            {t('Create your first chart to start visualizing data')}
          </CardDescription>
          <div>
            <Button asChild>
              <Link href="/charts/new">
                <RiAddLine className="h-4 w-4 mr-2" />
                {t('Create Chart')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{t('Chart List')}</h2>
          <p className="text-muted-foreground">{t('{count} charts', { count: charts.length })}</p>
        </div>
        <Button asChild>
          <Link href="/charts/new">
            <RiAddLine className="h-4 w-4 mr-2" />
            {t('New Chart')}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map((chart) => (
          <Card key={chart.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getChartIcon(chart.chartType)}
                  <CardTitle className="text-lg">{chart.title}</CardTitle>
                </div>
                <Badge variant={getChartBadgeVariant(chart.chartType)}>
                  {chart.chartType.toUpperCase()}
                </Badge>
              </div>
              {chart.description && (
                <CardDescription className="mt-1">{chart.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Dataset:')}</span>
                <span
                  className="font-medium truncate max-w-[150px]"
                  title={getDatasetName(chart.datasetId)}
                >
                  {getDatasetName(chart.datasetId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Created at:')}</span>
                <span>{formatDate(chart.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Chart ID:')}</span>
                <span className="font-mono">{chart.id}</span>
              </div>
            </CardContent>

            <CardFooter className="pt-3 gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/charts/${chart.id}`}>
                  <RiEyeLine className="h-4 w-4 mr-1" />
                  {t('View')}
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/charts/${chart.id}/edit`}>
                  <RiEditLine className="h-4 w-4 mr-1" />
                  {t('Edit')}
                </Link>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleDeleteClick(chart)}
              >
                <RiDeleteBin2Line className="h-4 w-4 mr-1" />
                {t('Delete')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('Delete Chart')}
        description={
          chartToDelete
            ? t('Are you sure to delete chart "{title}"? This action cannot be undone.', {
                title: chartToDelete.title,
              })
            : t('Are you sure to delete this chart?')
        }
        confirmText={t('Delete')}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
