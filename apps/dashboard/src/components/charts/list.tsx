'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { deleteChart } from '@/lib/api/charts';
import type { Chart, Dataset } from '@/types/chart';
import {
  RiAddLine,
  RiBarChartLine,
  RiDeleteBin2Line,
  RiEditLine,
  RiEyeLine,
  RiLineChartLine,
  RiPieChartLine,
  RiRadarLine,
  RiTableLine,
} from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { Link } from '@/i18n/client-routing';
import { formatDateTime } from '@/lib/utils/date';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { toast } from 'sonner';

interface ChartListProps {
  charts: Chart[];
  datasets: Dataset[];
  onRefresh?: () => void;
}

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

export function ChartList({ charts, datasets, onRefresh }: ChartListProps) {
  const t = useTranslations();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [chartToDelete, setChartToDelete] = React.useState<Chart | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const datasetMap = React.useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset])),
    [datasets],
  );
  const getDatasetName = React.useCallback(
    (datasetId: number) => datasetMap.get(datasetId)?.name || t('Unknown Dataset'),
    [datasetMap, t],
  );

  const chartTypeIcons = React.useMemo(
    () => ({
      line: RiLineChartLine,
      bar: RiBarChartLine,
      area: RiLineChartLine,
      pie: RiPieChartLine,
      radar: RiRadarLine,
      radial: RiPieChartLine,
      table: RiTableLine,
    }),
    [],
  );
  const chartTypeBadgeVariant = React.useMemo<Record<Chart['chartType'], BadgeVariant>>(
    () => ({
      line: 'default',
      bar: 'secondary',
      area: 'outline',
      pie: 'destructive',
      radar: 'outline',
      radial: 'secondary',
      table: 'secondary',
    }),
    [],
  );
  const getChartIcon = (chartType: Chart['chartType']) => {
    const Icon = chartTypeIcons[chartType] ?? RiBarChartLine;
    return <Icon className="h-5 w-5" aria-hidden="true" />;
  };
  const getChartBadgeVariant = (chartType: Chart['chartType']): BadgeVariant =>
    chartTypeBadgeVariant[chartType] ?? 'default';

  const handleDeleteClick = (chart: Chart) => {
    setChartToDelete(chart);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chartToDelete) return;

    try {
      setIsDeleting(true);
      await deleteChart(chartToDelete.id);
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

  const formatDate = (dateString: string) => formatDateTime(dateString);

  if (charts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <RiBarChartLine className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle>{t('No Charts')}</CardTitle>
          <CardDescription>
            {t('Create your first chart to start visualizing data')}
          </CardDescription>
          <div>
            <Button asChild>
              <Link href="/dashboard/charts/new">
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
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
          <Link href="/dashboard/charts/new">
            <RiAddLine className="h-4 w-4" aria-hidden="true" />
            {t('New Chart')}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map((chart) => (
          <Card key={chart.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {getChartIcon(chart.chartType)}
                  <CardTitle className="text-lg truncate">{chart.title}</CardTitle>
                </div>
                <Badge variant={getChartBadgeVariant(chart.chartType)}>
                  {chart.chartType.toUpperCase()}
                </Badge>
              </div>
              {chart.description && (
                <CardDescription className="mt-1 break-words">{chart.description}</CardDescription>
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
                <Link href={`/dashboard/charts/${chart.id}`}>
                  <RiEyeLine className="h-4 w-4" aria-hidden="true" />
                  {t('View')}
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/dashboard/charts/${chart.id}/edit`}>
                  <RiEditLine className="h-4 w-4" aria-hidden="true" />
                  {t('Edit')}
                </Link>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleDeleteClick(chart)}
              >
                <RiDeleteBin2Line className="h-4 w-4" aria-hidden="true" />
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
            ? t(`Are you sure to delete chart '{title}'? This action cannot be undone`, {
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
