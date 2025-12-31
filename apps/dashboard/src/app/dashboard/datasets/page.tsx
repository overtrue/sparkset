'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
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
import { useRouter } from '@/i18n/client-routing';
import { useDatasets, useDeleteDataset } from '@/lib/api/datasets-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Dataset } from '@/types/api';
import { RiAddLine, RiDatabaseLine } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';

export default function DatasetsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useDatasets();
  const { trigger: deleteDataset } = useDeleteDataset();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  const {
    items: datasets,
    handleDelete,
    handleBulkDelete,
  } = useResourceList(data, mutate, {
    resourceName: t('Dataset'),
    onDelete: async (item) => {
      await deleteDataset(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteDataset(item.id);
      }
    },
  });

  const handleDeleteClick = (dataset: Dataset) => {
    openDialog({
      title: t('Delete Dataset'),
      description: t(`Are you sure to delete '{name}'? This cannot be undone`, {
        name: dataset.name,
      }),
      variant: 'destructive',
      onConfirm: () => handleDelete(dataset),
    });
  };

  const handleCreateNew = () => {
    router.push('/dashboard/query');
  };

  const formatDate = (value: string) => formatDateTime(value);

  const columns: ColumnDef<Dataset>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => {
        const dataset = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-primary font-medium"
            onClick={() => router.push(`/dashboard/datasets/${dataset.id}`)}
          >
            {row.getValue('name')}
          </Button>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('description') || '-'}</span>
      ),
      size: 250,
    },
    {
      accessorKey: 'datasourceName',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Datasource')} />,
      cell: ({ row }) => {
        const dataset = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-primary font-medium"
            onClick={() => router.push(`/dashboard/datasources/${dataset.datasourceId}`)}
          >
            {row.getValue('datasourceName')}
          </Button>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'schemaJson',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Field Count')} />,
      cell: ({ row }) => {
        const schema = row.getValue('schemaJson');
        return (
          <Badge variant="secondary">
            {t('{count} fields', {
              count: (schema as { name: string; type: string }[])?.length ?? 0,
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
        <span className="text-muted-foreground">{formatDate(row.getValue('createdAt'))}</span>
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
            icon: <RiDatabaseLine className="h-4 w-4" />,
            onClick: () => router.push(`/dashboard/datasets/${dataset.id}`),
          },
          {
            label: t('Create Chart'),
            icon: <RiAddLine className="h-4 w-4" />,
            onClick: () => router.push(`/dashboard/charts/new?datasetId=${dataset.id}`),
          },
          {
            label: t('Delete'),
            icon: <RiDatabaseLine className="h-4 w-4" />,
            onClick: () => handleDeleteClick(dataset),
            variant: 'destructive',
          },
        ];

        return <DataTableRowActions actions={actions} />;
      },
      size: 60,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Datasets')}
          description={t('Manage your query result datasets')}
          action={
            <Button onClick={handleCreateNew} disabled>
              <RiAddLine className="h-4 w-4" />
              {t('New Dataset')}
            </Button>
          }
        />
        <LoadingState message={t('Loading...')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Datasets')}
          description={t('Manage your query result datasets')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Dataset')}
            </Button>
          }
        />
        <ErrorState error={error} onRetry={() => mutate()} />
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Datasets')}
          description={t('Manage your query result datasets')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Dataset')}
            </Button>
          }
        />
        <EmptyState
          icon={<RiDatabaseLine className="h-8 w-8 text-muted-foreground" />}
          title={t('No Datasets')}
          description={t(
            'From Query page, execute SQL query and save result as dataset to create charts',
          )}
          action={{
            label: t('Create your first dataset'),
            onClick: handleCreateNew,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Datasets')}
        description={t('Manage your query result datasets')}
        action={
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4" />
            {t('New Dataset')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={datasets}
        searchKey="name"
        searchPlaceholder={t('Search datasets...')}
        enableRowSelection
        onDeleteSelected={handleBulkDelete}
        deleteConfirmTitle={t('Delete Dataset')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} dataset(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No datasets yet, click the button above to add')}
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
