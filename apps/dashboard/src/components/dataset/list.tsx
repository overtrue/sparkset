'use client';

import { useMemo } from 'react';
import { RiAddLine, RiDatabaseLine } from '@remixicon/react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import type { Dataset } from '@/types/api';

interface DatasetListProps {
  datasets: Dataset[];
  isLoading: boolean;
  error: Error | string | null;
  onRetry: () => void;
  onDelete: (dataset: Dataset) => void;
  onDeleteSelected: (rows: Dataset[]) => void;
}

export function DatasetList({
  datasets,
  isLoading,
  error,
  onRetry,
  onDelete,
  onDeleteSelected,
}: DatasetListProps) {
  const t = useTranslations();

  const headerAction = (
    <Button size="sm" asChild disabled={isLoading}>
      <Link href="/dashboard/query">
        <RiAddLine className="h-4 w-4" aria-hidden="true" />
        {t('New Dataset')}
      </Link>
    </Button>
  );

  const header = (
    <PageHeader
      title={t('Datasets')}
      description={t('Manage your query result datasets')}
      action={headerAction}
    />
  );

  const columns = useMemo<ColumnDef<Dataset>[]>(() => {
    return [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
        cell: ({ row }) => {
          const dataset = row.original;

          return (
            <div className="min-w-0">
              <Button
                variant="link"
                className="h-auto max-w-full truncate p-0 text-left font-medium text-primary"
                asChild
              >
                <Link href={`/dashboard/datasets/${dataset.id}`}>{row.getValue('name')}</Link>
              </Button>
            </div>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
        cell: ({ row }) => (
          <span className="break-words text-muted-foreground">
            {row.getValue('description') || '-'}
          </span>
        ),
        size: 250,
      },
      {
        accessorKey: 'datasourceName',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Datasource')} />,
        cell: ({ row }) => {
          const dataset = row.original;

          return (
            <div className="min-w-0">
              <Button
                variant="link"
                className="h-auto max-w-full truncate p-0 text-left font-medium text-primary"
                asChild
              >
                <Link href={`/dashboard/datasources/${dataset.datasourceId}`}>
                  {row.getValue('datasourceName')}
                </Link>
              </Button>
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'schemaJson',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Field Count')} />,
        cell: ({ row }) => {
          const schema = row.original.schemaJson;

          return (
            <Badge variant="secondary">
              {t('{count} fields', {
                count: schema?.length ?? 0,
              })}
            </Badge>
          );
        },
        size: 100,
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
          const dataset = row.original;
          const actions: RowAction[] = [
            {
              label: t('View Details'),
              icon: <RiDatabaseLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/datasets/${dataset.id}`,
            },
            {
              label: t('Create Chart'),
              icon: <RiAddLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/charts/new?datasetId=${dataset.id}`,
            },
            {
              label: t('Delete'),
              icon: <RiDatabaseLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onDelete(dataset),
              variant: 'destructive',
            },
          ];

          return <DataTableRowActions actions={actions} />;
        },
        size: 60,
      },
    ];
  }, [onDelete, t]);

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

  if (datasets.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<RiDatabaseLine className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title={t('No Datasets')}
          description={t(
            'From Query page, execute SQL query and save result as dataset to create charts',
          )}
          action={{
            label: t('Create Your First Dataset'),
            href: '/dashboard/query',
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
        data={datasets}
        searchKey="name"
        searchPlaceholder={t('Search datasets…')}
        enableRowSelection
        onDeleteSelected={onDeleteSelected}
        deleteConfirmTitle={t('Delete Dataset')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} dataset(s)? This action cannot be undone',
            {
              count,
            },
          )
        }
        emptyMessage={t('No datasets yet, click the button above to add')}
      />
    </div>
  );
}
