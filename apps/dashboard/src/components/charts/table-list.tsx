'use client';

import { useMemo } from 'react';
import {
  RiAddLine,
  RiBarChartLine,
  RiDashboardLine,
  RiDatabaseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiLineChartLine,
  RiPieChartLine,
  RiRadarLine,
  RiTableLine,
} from '@remixicon/react';
import type { ColumnDef } from '@tanstack/react-table';
import type { VariantProps } from 'class-variance-authority';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { DashboardSelector } from '@/components/dashboard-selector';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import type { Chart, Dataset } from '@/types/api';

type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];

const CHART_TYPE_ICONS = {
  line: RiLineChartLine,
  bar: RiBarChartLine,
  area: RiLineChartLine,
  pie: RiPieChartLine,
  radar: RiRadarLine,
  radial: RiPieChartLine,
  table: RiTableLine,
} satisfies Record<Chart['chartType'], typeof RiBarChartLine>;

const CHART_TYPE_BADGE_VARIANT: Record<Chart['chartType'], BadgeVariant> = {
  line: 'default',
  bar: 'secondary',
  area: 'outline',
  pie: 'destructive',
  radar: 'outline',
  radial: 'secondary',
  table: 'secondary',
};

interface ChartTableListProps {
  charts: Chart[];
  datasets: Dataset[];
  isLoading: boolean;
  error: Error | string | null;
  selectedChartForDashboard: number | null;
  onRetry: () => void;
  onDelete: (chart: Chart) => void;
  onDeleteSelected: (rows: Chart[]) => void;
  onSelectChartForDashboard: (chartId: number) => void;
  onCloseDashboardSelector: () => void;
}

export function ChartTableList({
  charts,
  datasets,
  isLoading,
  error,
  selectedChartForDashboard,
  onRetry,
  onDelete,
  onDeleteSelected,
  onSelectChartForDashboard,
  onCloseDashboardSelector,
}: ChartTableListProps) {
  const t = useTranslations();
  const pageTitle = t('Chart Management');
  const pageDescription = t('Create and manage dataset-based visualization charts');
  const hasDatasets = datasets.length > 0;

  const headerAction = (
    <Button size="sm" asChild disabled={isLoading}>
      <Link href={hasDatasets ? '/dashboard/charts/new' : '/dashboard/query'}>
        <RiAddLine className="h-4 w-4" aria-hidden="true" />
        {hasDatasets ? t('Create Chart') : t('Go to create dataset')}
      </Link>
    </Button>
  );

  const header = (
    <PageHeader title={pageTitle} description={pageDescription} action={headerAction} />
  );

  const datasetsById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset])),
    [datasets],
  );

  const columns = useMemo<ColumnDef<Chart>[]>(() => {
    const makeIcon = (chartType: Chart['chartType']) => {
      const Icon = CHART_TYPE_ICONS[chartType] ?? RiBarChartLine;

      return <Icon className="h-4 w-4" aria-hidden="true" />;
    };

    const makeBadgeVariant = (chartType: Chart['chartType']): BadgeVariant =>
      CHART_TYPE_BADGE_VARIANT[chartType] ?? 'default';

    return [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Chart Name')} />,
        cell: ({ row }) => {
          const chart = row.original;

          return (
            <div className="flex min-w-0 items-center gap-2">
              {makeIcon(chart.chartType)}
              <Button
                variant="link"
                className="h-auto max-w-full truncate p-0 text-left font-medium text-primary"
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
          const datasetId = row.original.datasetId;
          const dataset = datasetsById.get(datasetId);

          return (
            <Button
              variant="link"
              className="block h-auto max-w-[150px] truncate p-0 text-left text-primary"
              asChild
            >
              <Link href={`/dashboard/datasets/${datasetId}`}>
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
          <span className="break-words text-muted-foreground">
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
              icon: <RiEdit2Line className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/charts/${chart.id}/edit`,
            },
            {
              label: t('Add to Dashboard'),
              icon: <RiDashboardLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onSelectChartForDashboard(chart.id),
            },
            {
              label: t('Create From This'),
              icon: <RiAddLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/charts/new?datasetId=${chart.datasetId}`,
            },
            {
              label: t('Delete'),
              icon: <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onDelete(chart),
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
                  defaultOpen
                  onOpenChange={(open) => {
                    if (!open) {
                      onCloseDashboardSelector();
                    }
                  }}
                  onAdded={onCloseDashboardSelector}
                />
              )}
            </div>
          );
        },
        size: 100,
      },
    ];
  }, [
    datasetsById,
    onCloseDashboardSelector,
    onDelete,
    onSelectChartForDashboard,
    selectedChartForDashboard,
    t,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState message={t('Loading…')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!hasDatasets) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<RiDatabaseLine className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title={t('No Datasets')}
          description={t('Please create a dataset from the Query page first')}
          action={{
            label: t('Execute Query and Create Dataset'),
            href: '/dashboard/query',
          }}
        />
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="space-y-6">
        {header}
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
      {header}
      <DataTable
        columns={columns}
        data={charts}
        searchKey="title"
        searchPlaceholder={t('Search…')}
        enableRowSelection
        onDeleteSelected={onDeleteSelected}
        deleteConfirmTitle={t('Delete Chart')}
        deleteConfirmDescription={(count) =>
          t('Are you sure to delete the selected {count} chart(s)? This action cannot be undone', {
            count,
          })
        }
        emptyMessage={t('No Charts')}
      />
    </div>
  );
}
