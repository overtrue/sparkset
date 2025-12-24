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
import { useRouter } from '@/i18n/routing';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset } from '@/types/chart';
import { RiAddLine, RiDatabaseLine } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function DatasetsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const result = await datasetsApi.list();
      setDatasets(result.items);
    } catch (error) {
      toast.error(t('Failed to load datasets'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dataset: Dataset) => {
    setDatasetToDelete(dataset);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!datasetToDelete) return;

    try {
      await datasetsApi.delete(datasetToDelete.id);
      toast.success(t('Dataset deleted'));
      loadDatasets();
    } catch (error) {
      toast.error(t('Failed to delete dataset'));
    } finally {
      setDeleteConfirmOpen(false);
      setDatasetToDelete(null);
    }
  };

  const handleCreateNew = () => {
    router.push('/query');
  };

  const handleDeleteSelected = async (rows: Dataset[]) => {
    for (const row of rows) {
      try {
        await datasetsApi.delete(row.id);
      } catch (err) {
        toast.error(`${t('Delete failed')}: ${row.name}`);
      }
    }
    setDatasets((prev) => prev.filter((d) => !rows.some((r) => r.id === d.id)));
    toast.success(t('Successfully deleted {count} dataset(s)', { count: rows.length }));
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

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
            onClick={() => router.push(`/datasets/${dataset.id}`)}
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
            onClick={() => router.push(`/datasources/${dataset.datasourceId}`)}
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
            onClick: () => router.push(`/datasets/${dataset.id}`),
          },
          {
            label: t('Create Chart'),
            icon: <RiAddLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/new?datasetId=${dataset.id}`),
          },
          {
            label: t('Delete'),
            icon: <RiDatabaseLine className="h-4 w-4" />,
            onClick: () => handleDelete(dataset),
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
          title={t('Datasets')}
          description={t('Manage your query result datasets')}
          action={
            <Button onClick={handleCreateNew} disabled>
              <RiAddLine className="h-4 w-4" />
              {t('New Dataset')}
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
          title={t('Datasets')}
          description={t('Manage your query result datasets')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Dataset')}
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiDatabaseLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('No Datasets')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('From Query page, execute SQL query and save result as dataset to create charts')}
          </p>
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4" />
            {t('Create your first dataset')}
          </Button>
        </div>
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
        searchPlaceholder={t('Search datasets…')}
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle={t('Delete Dataset')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} dataset(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No datasets yet, click the button above to add')}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('Delete Dataset')}
        description={t(`Are you sure to delete '{name}'? This cannot be undone`, {
          name: datasetToDelete?.name || '',
        })}
        onConfirm={confirmDelete}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant="destructive"
      />
    </div>
  );
}
