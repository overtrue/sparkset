'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { DashboardSelector } from '@/components/dashboard-selector';
import { PageHeader } from '@/components/page-header';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/client-routing';
import { useCharts, useDeleteChart } from '@/lib/api/charts-hooks';
import { useDatasets } from '@/lib/api/datasets-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Chart } from '@/types/api';
import {
  RiAddLine,
  RiBarChartLine,
  RiDashboardLine,
  RiLineChartLine,
  RiPieChartLine,
  RiRadarLine,
  RiTableLine,
} from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import type { VariantProps } from 'class-variance-authority';
import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

export default function ChartsPage() {
  const t = useTranslations();
  const {
    data: chartsData,
    error: chartsError,
    isLoading: chartsLoading,
    mutate: mutateCharts,
  } = useCharts();
  const { data: datasetsData, error: datasetsError, isLoading: datasetsLoading } = useDatasets();
  const { trigger: deleteChart } = useDeleteChart();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();
  const [selectedChartForDashboard, setSelectedChartForDashboard] = useState<number | null>(null);

  const chartTypeIcons = useMemo(
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

  const chartTypeBadgeVariant = useMemo<Record<Chart['chartType'], BadgeVariant>>(
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

  const {
    items: charts,
    handleDelete,
    handleBulkDelete,
  } = useResourceList(chartsData, mutateCharts, {
    resourceName: t('Chart'),
    onDelete: async (item) => {
      await deleteChart(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteChart(item.id);
      }
    },
  });

  const datasets = datasetsData?.items || [];
  const isLoading = chartsLoading || datasetsLoading;
  const error = chartsError || datasetsError;
  const datasetsById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset])),
    [datasets],
  );

  const handleDeleteClick = useCallback(
    (chart: Chart) => {
      openDialog({
        title: t('Delete Chart'),
        description: t(`Are you sure to delete '{name}'? This cannot be undone`, {
          name: chart.title,
        }),
        variant: 'destructive',
        onConfirm: () => handleDelete(chart),
      });
    },
    [handleDelete, openDialog, t],
  );

  const closeDashboardSelector = useCallback(() => {
    setSelectedChartForDashboard(null);
  }, []);

  const columns = useMemo<ColumnDef<Chart>[]>(() => {
    const makeIcon = (chartType: Chart['chartType']) => {
      const Icon = chartTypeIcons[chartType] ?? RiBarChartLine;
      return <Icon className="h-4 w-4" aria-hidden="true" />;
    };

    const makeBadgeVariant = (chartType: Chart['chartType']): BadgeVariant =>
      chartTypeBadgeVariant[chartType] ?? 'default';

    return [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Chart Name')} />,
        cell: ({ row }) => {
          const chart = row.original;
          return (
            <div className="flex items-center gap-2 min-w-0">
              {makeIcon(chart.chartType)}
              <Button
                variant="link"
                className="h-auto p-0 text-primary font-medium truncate max-w-full text-left"
                asChild
              >
                <Link href={`/dashboard/charts/${chart.id}`}>{row.getValue('title')}</Link>
              </Button>
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'chartType',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Type')} />,
        cell: ({ row }) => {
          const chartType = row.original.chartType;
          return <Badge variant={makeBadgeVariant(chartType)}>{chartType.toUpperCase()}</Badge>;
        },
        size: 100,
      },
      {
        accessorKey: 'datasetId',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Dataset')} />,
        cell: ({ row }) => {
          const datasetId = row.getValue('datasetId');
          const dataset = datasetsById.get(datasetId as number);
          return (
            <Button
              variant="link"
              className="h-auto p-0 text-primary truncate max-w-[150px] block text-left"
              asChild
            >
              <Link href={`/dashboard/datasets/${String(datasetId)}`}>
                {dataset?.name || t('Unknown Dataset')}
              </Link>
            </Button>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground break-words">
            {row.getValue('description') || '-'}
          </span>
        ),
        size: 200,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Created At')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDateTime(row.getValue('createdAt'))}</span>
        ),
        size: 180,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('Actions')}</span>,
        cell: ({ row }) => {
          const chart = row.original;
          const actions: RowAction[] = [
            {
              label: t('View Details'),
              icon: <RiBarChartLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/charts/${chart.id}`,
            },
            {
              label: t('Edit'),
              icon: <RiBarChartLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/charts/${chart.id}/edit`,
            },
            {
              label: t('Add to Dashboard'),
              icon: <RiDashboardLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => setSelectedChartForDashboard(chart.id),
            },
            {
              label: t('Create From This'),
              icon: <RiAddLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/charts/new?datasetId=${chart.datasetId}`,
            },
            {
              label: t('Delete'),
              icon: <RiBarChartLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => handleDeleteClick(chart),
              variant: 'destructive',
            },
          ];

          return (
            <div className="flex items-center gap-2">
              <DataTableRowActions actions={actions} />
              {selectedChartForDashboard === chart.id && (
                <DashboardSelector
                  type="chart"
                  contentId={chart.id}
                  size="sm"
                  defaultOpen={true}
                  onOpenChange={(open) => {
                    if (!open) {
                      closeDashboardSelector();
                    }
                  }}
                  onAdded={closeDashboardSelector}
                />
              )}
            </div>
          );
        },
        size: 100,
      },
    ];
  }, [
    chartTypeBadgeVariant,
    chartTypeIcons,
    closeDashboardSelector,
    datasetsById,
    handleDeleteClick,
    selectedChartForDashboard,
    t,
  ]);

  const pageTitle = t('Chart Management');
  const pageDescription = t('Create and manage dataset-based visualization charts');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          action={
            <Button asChild disabled>
              <Link href="/dashboard/charts/new">
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
                {t('Create Chart')}
              </Link>
            </Button>
          }
        />
        <LoadingState message={t('Loading…')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          action={
            <Button asChild>
              <Link href="/dashboard/charts/new">
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
                {t('Create Chart')}
              </Link>
            </Button>
          }
        />
        <ErrorState error={error} onRetry={() => mutateCharts()} />
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          action={
            <Button asChild>
              <Link href="/dashboard/query">
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
                {t('Go to create dataset')}
              </Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>{t('No Datasets')}</CardTitle>
            <CardDescription>
              {t('Please create a dataset from the Query page first')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/query">
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
                {t('Execute Query and Create Dataset')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={pageTitle}
          description={pageDescription}
          action={
            <Button asChild>
              <Link href="/dashboard/charts/new">
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
                {t('Create Chart')}
              </Link>
            </Button>
          }
        />
        <EmptyState
          icon={<RiBarChartLine className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title={t('No Charts')}
          description={t('Create your first chart to start visualizing data')}
          action={{
            label: t('Create Chart'),
            href: '/dashboard/charts/new',
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        action={
          <Button size="sm" asChild>
            <Link href="/dashboard/charts/new">
              <RiAddLine className="h-4 w-4" aria-hidden="true" />
              {t('Create Chart')}
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={charts}
        searchKey="title"
        searchPlaceholder={t('Search…')}
        enableRowSelection
        onDeleteSelected={handleBulkDelete}
        deleteConfirmTitle={t('Delete Chart')}
        deleteConfirmDescription={(count) =>
          t('Are you sure to delete the selected {count} chart(s)? This action cannot be undone', {
            count,
          })
        }
        emptyMessage={t('No Charts')}
      />

      {dialogState && (
        <ConfirmDialog
          open={dialogState.open}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
          title={dialogState.title}
          description={dialogState.description}
          onConfirm={handleConfirm}
          confirmText={dialogState.confirmText}
          cancelText={dialogState.cancelText}
          variant={dialogState.variant}
        />
      )}
    </div>
  );
}
