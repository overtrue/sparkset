'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/routing';
import { dashboardsApi } from '@/lib/api/dashboards';
import type { Dashboard } from '@/types/dashboard';
import { RiAddLine, RiDashboardLine } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function DashboardsPage() {
  const t = useTranslations();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<Dashboard | null>(null);

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const result = await dashboardsApi.list();
      setDashboards(result.items);
    } catch (error) {
      toast.error(t('Failed to load dashboards'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dashboard: Dashboard) => {
    setDashboardToDelete(dashboard);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dashboardToDelete) return;

    try {
      await dashboardsApi.delete(dashboardToDelete.id);
      toast.success(t('Dashboard deleted'));
      loadDashboards();
    } catch (error) {
      toast.error(t('Failed to delete dashboard'));
    } finally {
      setDeleteConfirmOpen(false);
      setDashboardToDelete(null);
    }
  };

  const handleDeleteSelected = async (rows: Dashboard[]) => {
    for (const row of rows) {
      try {
        await dashboardsApi.delete(row.id);
      } catch (err) {
        toast.error(`${t('Delete failed')}: ${row.title}`);
      }
    }
    setDashboards((prev) => prev.filter((d) => !rows.some((r) => r.id === d.id)));
    toast.success(t('Successfully deleted {count} dashboard(s)', { count: rows.length }));
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const columns: ColumnDef<Dashboard>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => {
        const dashboard = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-foreground font-medium"
            onClick={() => router.push(`/dashboards/${dashboard.id}`)}
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
        <span className="text-xs text-muted-foreground">{row.getValue('description') || '-'}</span>
      ),
      size: 250,
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
        const dashboard = row.original;
        const actions: RowAction[] = [
          {
            label: t('View'),
            icon: <RiDashboardLine className="h-4 w-4" />,
            onClick: () => router.push(`/dashboards/${dashboard.id}`),
          },
          {
            label: t('Delete'),
            icon: <RiDashboardLine className="h-4 w-4" />,
            onClick: () => handleDelete(dashboard),
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
          title={t('Dashboards')}
          description={t('Create and manage data visualization dashboards')}
          action={
            <Button disabled>
              <RiAddLine className="h-4 w-4 mr-2" />
              {t('New Dashboard')}
            </Button>
          }
        />
        <div className="text-center py-12 text-muted-foreground">{t('Loading…')}</div>
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
            <Button onClick={() => router.push('/dashboards/new')}>
              <RiAddLine className="h-4 w-4 mr-2" />
              {t('New Dashboard')}
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiDashboardLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('No Dashboards')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('Create your first dashboard to start visualizing data')}
          </p>
          <Button onClick={() => router.push('/dashboards/new')}>
            <RiAddLine className="h-4 w-4 mr-2" />
            {t('Create Dashboard')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Dashboards')}
        description={t('Create and manage data visualization dashboards')}
        action={
          <Button onClick={() => router.push('/dashboards/new')}>
            <RiAddLine className="h-4 w-4 mr-2" />
            {t('New Dashboard')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={dashboards}
        searchKey="title"
        searchPlaceholder={t('Search…')}
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle={t('Delete Dashboard')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} dashboard(s)? This action cannot be undone.',
            { count },
          )
        }
        emptyMessage={t('No Dashboards')}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('Delete Dashboard')}
        description={t('Are you sure to delete this dashboard? This action cannot be undone.')}
        onConfirm={confirmDelete}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant="destructive"
      />
    </div>
  );
}
