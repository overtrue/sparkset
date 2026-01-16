'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { CreateDatasourceDialog } from '@/components/datasource/create-dialog';
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
import {
  useDatasources,
  useDeleteDatasource,
  useSetDefaultDatasource,
  useSyncDatasource,
} from '@/lib/api/datasources-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Datasource } from '@/types/api';
import { RiAddLine, RiDatabase2Line, RiSettings4Line } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import { toast } from 'sonner';
import { useState } from 'react';

export default function DatasourcesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useDatasources();
  const { trigger: deleteDatasource } = useDeleteDatasource();
  const { trigger: setDefaultDatasource } = useSetDefaultDatasource();
  const { trigger: syncDatasource } = useSyncDatasource();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    items: datasources,
    handleDelete,
    handleBulkDelete,
  } = useResourceList(data, mutate, {
    resourceName: t('Datasource'),
    onDelete: async (item) => {
      await deleteDatasource(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteDatasource(item.id);
      }
    },
  });

  const handleDeleteClick = (datasource: Datasource) => {
    openDialog({
      title: t('Delete Datasource'),
      description: t(`Are you sure to delete '{name}'? This cannot be undone`, {
        name: datasource.name,
      }),
      variant: 'destructive',
      onConfirm: () => handleDelete(datasource),
    });
  };

  const handleCreateNew = () => {
    setCreateDialogOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDatasourceCreated = (_: Datasource) => {
    toast.success(t('Datasource created successfully'));
    mutate();
    setCreateDialogOpen(false);
  };

  const handleViewDetails = (datasource: Datasource) => {
    router.push(`/dashboard/datasources/${datasource.id}`);
  };

  const handleSetDefault = async (datasource: Datasource) => {
    try {
      await setDefaultDatasource(datasource.id);
      toast.success(t('Datasource set as default'));
      mutate();
    } catch {
      toast.error(t('Failed to set default datasource'));
    }
  };

  const handleSync = async (datasource: Datasource) => {
    try {
      await syncDatasource(datasource.id);
      toast.success(t('Datasource sync started'));
      mutate();
    } catch {
      toast.error(t('Failed to sync datasource'));
    }
  };

  const formatDate = (value: string) => formatDateTime(value);

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
            {datasource.isDefault && (
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
            onClick: () => handleDeleteClick(datasource),
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
        <LoadingState message={t('Loading...')} />
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
        <ErrorState error={error} onRetry={() => mutate()} />
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
        <EmptyState
          icon={<RiDatabase2Line className="h-8 w-8 text-muted-foreground" />}
          title={t('No Datasources')}
          description={t('Connect to your databases to start querying data')}
          action={{
            label: t('Add your first datasource'),
            onClick: handleCreateNew,
          }}
        />
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
        onDeleteSelected={handleBulkDelete}
        deleteConfirmTitle={t('Delete Datasource')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} datasource(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No datasources yet, click the button above to add')}
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

      <CreateDatasourceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleDatasourceCreated}
      />
    </div>
  );
}
