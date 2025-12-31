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
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/client-routing';
import { useDashboards, useDeleteDashboard } from '@/lib/api/dashboards-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Dashboard } from '@/types/api';
import { RiAddLine, RiDashboardLine } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';

export default function DashboardsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useDashboards();
  const { trigger: deleteDashboard } = useDeleteDashboard();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  const {
    items: dashboards,
    handleDelete,
    handleBulkDelete,
  } = useResourceList(data, mutate, {
    resourceName: t('Dashboard'),
    onDelete: async (item) => {
      await deleteDashboard(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteDashboard(item.id);
      }
    },
  });

  const handleDeleteClick = (dashboard: Dashboard) => {
    openDialog({
      title: t('Delete Dashboard'),
      description: t('Are you sure to delete this dashboard? This action cannot be undone'),
      variant: 'destructive',
      onConfirm: () => handleDelete(dashboard),
    });
  };

  const formatDate = (value: string) => formatDateTime(value);

  const columns: ColumnDef<Dashboard>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => {
        const dashboard = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-primary font-medium"
            onClick={() => router.push(`/dashboard/dashboards/${dashboard.id}`)}
          >
            {row.getValue('title')}
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
        const dashboard = row.original;
        const actions: RowAction[] = [
          {
            label: t('View'),
            icon: <RiDashboardLine className="h-4 w-4" />,
            onClick: () => router.push(`/dashboard/dashboards/${dashboard.id}`),
          },
          {
            label: t('Delete'),
            icon: <RiDashboardLine className="h-4 w-4" />,
            onClick: () => handleDeleteClick(dashboard),
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
          title={t('Dashboards')}
          description={t('Create and manage data visualization dashboards')}
          action={
            <Button disabled>
              <RiAddLine className="h-4 w-4" />
              {t('New Dashboard')}
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
          title={t('Dashboards')}
          description={t('Create and manage data visualization dashboards')}
          action={
            <Button onClick={() => router.push('/dashboard/dashboards/new')}>
              <RiAddLine className="h-4 w-4" />
              {t('New Dashboard')}
            </Button>
          }
        />
        <ErrorState error={error} onRetry={() => mutate()} />
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Dashboards')}
          description={t('Create and manage data visualization dashboards')}
          action={
            <Button onClick={() => router.push('/dashboard/dashboards/new')}>
              <RiAddLine className="h-4 w-4" />
              {t('New Dashboard')}
            </Button>
          }
        />
        <EmptyState
          icon={<RiDashboardLine className="h-8 w-8 text-muted-foreground" />}
          title={t('No Dashboards')}
          description={t('Create your first dashboard to start visualizing data')}
          action={{
            label: t('Create Dashboard'),
            onClick: () => router.push('/dashboard/dashboards/new'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Dashboards')}
        description={t('Create and manage data visualization dashboards')}
        action={
          <Button onClick={() => router.push('/dashboard/dashboards/new')}>
            <RiAddLine className="h-4 w-4" />
            {t('New Dashboard')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={dashboards}
        searchKey="title"
        searchPlaceholder={t('Search...')}
        enableRowSelection
        onDeleteSelected={handleBulkDelete}
        deleteConfirmTitle={t('Delete Dashboard')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} dashboard(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No Dashboards')}
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
