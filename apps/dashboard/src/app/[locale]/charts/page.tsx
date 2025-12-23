'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link, useRouter } from '@/i18n/routing';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import type { Chart, Dataset } from '@/types/chart';
import {
  RiAddLine,
  RiBarChartLine,
  RiLineChartLine,
  RiPieChartLine,
  RiTableLine,
} from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function ChartsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<Chart | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [datasetsResult, chartsResult] = await Promise.all([
        datasetsApi.list(),
        chartsApi.list(),
      ]);
      setDatasets(datasetsResult.items);
      setCharts(chartsResult.items);
    } catch (error) {
      toast.error(t('Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const getChartIcon = (chartType: Chart['chartType']) => {
    const props = { className: 'h-4 w-4' };
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

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const handleDelete = async (chart: Chart) => {
    setChartToDelete(chart);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!chartToDelete) return;

    try {
      await chartsApi.delete(chartToDelete.id);
      toast.success(t('Chart deleted'));
      setDeleteConfirmOpen(false);
      setChartToDelete(null);
      loadData();
    } catch (error) {
      toast.error(t('Delete failed'));
    }
  };

  const handleDeleteSelected = async (rows: Chart[]) => {
    for (const row of rows) {
      try {
        await chartsApi.delete(row.id);
      } catch (err) {
        toast.error(`${t('Delete failed')}: ${row.title}`);
      }
    }
    setCharts((prev) => prev.filter((c) => !rows.some((r) => r.id === c.id)));
    toast.success(t('Successfully deleted {count} chart(s)', { count: rows.length }));
  };

  const columns: ColumnDef<Chart>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Chart Name')} />,
      cell: ({ row }) => {
        const chart = row.original;
        return (
          <div className="flex items-center gap-2">
            {getChartIcon(chart.chartType)}
            <Button
              variant="link"
              className="h-auto p-0 text-primary font-medium"
              onClick={() => router.push(`/charts/${chart.id}`)}
            >
              {row.getValue('title')}
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
        return <Badge variant={getChartBadgeVariant(chartType)}>{chartType.toUpperCase()}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: 'datasetId',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Dataset')} />,
      cell: ({ row }) => {
        const datasetId = row.getValue('datasetId');
        const dataset = datasets.find((d) => d.id === datasetId);
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-primary truncate max-w-[150px] block text-left"
            onClick={() => router.push(`/datasets/${datasetId}`)}
          >
            {dataset?.name || t('Unknown Dataset')}
          </Button>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('description') || '-'}</span>
      ),
      size: 200,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Created At')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.getValue('createdAt'))}
        </span>
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
            icon: <RiBarChartLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/${chart.id}`),
          },
          {
            label: t('Edit'),
            icon: <RiBarChartLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/${chart.id}/edit`),
          },
          {
            label: t('Create from this'),
            icon: <RiAddLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/new?datasetId=${chart.datasetId}`),
          },
          {
            label: t('Delete'),
            icon: <RiBarChartLine className="h-4 w-4" />,
            onClick: () => handleDelete(chart),
            variant: 'destructive',
          },
        ];

        return <DataTableRowActions actions={actions} />;
      },
      size: 60,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Chart Management')}
          description={t('Create and manage dataset-based visualization charts')}
          action={
            <Button asChild disabled>
              <Link href="/charts/new">
                <RiAddLine className="h-4 w-4 mr-2" />
                {t('Create Chart')}
              </Link>
            </Button>
          }
        />
        <div className="text-center py-12 text-muted-foreground">{t('Loading…')}</div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Chart Management')}
          description={t('Create and manage dataset-based visualization charts')}
          action={
            <Button asChild>
              <Link href="/query">
                <RiAddLine className="h-4 w-4 mr-2" />
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
              <Link href="/query">
                <RiAddLine className="h-4 w-4 mr-2" />
                {t('Execute query and create dataset')}
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
          title={t('Chart Management')}
          description={t('Create and manage dataset-based visualization charts')}
          action={
            <Button asChild>
              <Link href="/charts/new">
                <RiAddLine className="h-4 w-4 mr-2" />
                {t('Create Chart')}
              </Link>
            </Button>
          }
        />

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiBarChartLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('No Charts')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('Create your first chart to start visualizing data')}
          </p>
          <Button asChild>
            <Link href="/charts/new">
              <RiAddLine className="h-4 w-4 mr-2" />
              {t('Create Chart')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Chart Management')}
        description={t('Create and manage dataset-based visualization charts')}
        action={
          <Button asChild>
            <Link href="/charts/new">
              <RiAddLine className="h-4 w-4 mr-2" />
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
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle={t('Delete Chart')}
        deleteConfirmDescription={(count) =>
          t('Are you sure to delete the selected {count} chart(s)? This action cannot be undone.', {
            count,
          })
        }
        emptyMessage={t('No Charts')}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('Delete Chart')}
        description={t('Are you sure to delete chart \"{title}\"? This action cannot be undone.', {
          title: chartToDelete?.title || '',
        })}
        onConfirm={confirmDelete}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant="destructive"
      />
    </div>
  );
}
