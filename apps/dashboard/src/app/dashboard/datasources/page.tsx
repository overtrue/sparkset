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
import { useRouter } from '@/i18n/client-routing';
import { datasourcesApi } from '@/lib/api/datasources';
import { useDatasources } from '@/lib/api/datasources-hooks';
import type { Datasource } from '@/types/chart';
import { RiAddLine, RiDatabase2Line, RiSettings4Line } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { useState } from 'react';
import { toast } from 'sonner';

export default function DatasourcesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useDatasources();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [datasourceToDelete, setDatasourceToDelete] = useState<Datasource | null>(null);

  const datasources = data?.items || [];

  const handleDelete = async (datasource: Datasource) => {
    setDatasourceToDelete(datasource);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!datasourceToDelete) return;

    try {
      await datasourcesApi.delete(datasourceToDelete.id);
      toast.success(t('Datasource deleted'));
      mutate(); // Refresh the list
    } catch {
      toast.error(t('Failed to delete datasource'));
    } finally {
      setDeleteConfirmOpen(false);
      setDatasourceToDelete(null);
    }
  };

  const handleCreateNew = () => {
    // TODO: Navigate to create datasource page
    toast.info('Create datasource page coming soon');
  };

  const handleViewDetails = (datasource: Datasource) => {
    router.push(`/dashboard/datasources/${datasource.id}`);
  };

  const handleSetDefault = async (datasource: Datasource) => {
    try {
      await datasourcesApi.setDefault(datasource.id);
      toast.success(t('Datasource set as default'));
      mutate();
    } catch {
      toast.error(t('Failed to set default datasource'));
    }
  };

  const handleSync = async (datasource: Datasource) => {
    try {
      await datasourcesApi.sync(datasource.id);
      toast.success(t('Datasource sync started'));
    } catch {
      toast.error(t('Failed to sync datasource'));
    }
  };

  const formatDate = (value: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const columns: ColumnDef<Datasource>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => {
        const datasource = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-primary font-medium"
            onClick={() => handleViewDetails(datasource)}
          >
            {row.getValue('name')}
            {datasource.isDefault === 1 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {t('Default')}
              </Badge>
            )}
          </Button>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Type')} />,
      cell: ({ row }) => <Badge variant="outline">{row.getValue('type')}</Badge>,
      size: 100,
    },
    {
      accessorKey: 'host',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Host')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue('host')}:{row.original.port}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'database',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Database')} />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('database')}</span>,
      size: 120,
    },
    {
      accessorKey: 'lastSyncAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Last Sync')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue('lastSyncAt'))}</span>
      ),
      size: 180,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('Actions')}</span>,
      cell: ({ row }) => {
        const datasource = row.original;
        const actions: RowAction[] = [
          {
            label: t('View Details'),
            icon: <RiDatabase2Line className="h-4 w-4" />,
            onClick: () => handleViewDetails(datasource),
          },
          {
            label: t('Sync Tables'),
            icon: <RiSettings4Line className="h-4 w-4" />,
            onClick: () => handleSync(datasource),
          },
          {
            label: t('Set as Default'),
            icon: <RiSettings4Line className="h-4 w-4" />,
            onClick: () => handleSetDefault(datasource),
          },
          {
            label: t('Delete'),
            icon: <RiDatabase2Line className="h-4 w-4" />,
            onClick: () => handleDelete(datasource),
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
          title={t('Datasources')}
          description={t('Manage your database connections')}
          action={
            <Button onClick={handleCreateNew} disabled>
              <RiAddLine className="h-4 w-4" />
              {t('New Datasource')}
            </Button>
          }
        />
        <div className="text-center py-12 text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Datasources')}
          description={t('Manage your database connections')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Datasource')}
            </Button>
          }
        />
        <div className="text-center py-12 text-destructive">
          {t('Failed to load datasources')}: {error.message}
        </div>
      </div>
    );
  }

  if (datasources.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Datasources')}
          description={t('Manage your database connections')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Datasource')}
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiDatabase2Line className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('No Datasources')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('Connect to your databases to start querying data')}
          </p>
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4" />
            {t('Add your first datasource')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Datasources')}
        description={t('Manage your database connections')}
        action={
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4" />
            {t('New Datasource')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={datasources}
        searchKey="name"
        searchPlaceholder={t('Search datasources...')}
        enableRowSelection
        onDeleteSelected={async (rows) => {
          for (const row of rows) {
            try {
              await datasourcesApi.delete(row.id);
            } catch {
              toast.error(`${t('Delete failed')}: ${row.name}`);
            }
          }
          mutate();
          toast.success(t('Successfully deleted {count} datasource(s)', { count: rows.length }));
        }}
        deleteConfirmTitle={t('Delete Datasource')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} datasource(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No datasources yet, click the button above to add')}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('Delete Datasource')}
        description={t(`Are you sure to delete '{name}'? This cannot be undone`, {
          name: datasourceToDelete?.name || '',
        })}
        onConfirm={confirmDelete}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant="destructive"
      />
    </div>
  );
}
