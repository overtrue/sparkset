'use client';

import { useMemo } from 'react';
import { RiAddLine, RiDashboardLine } from '@remixicon/react';
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
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import type { Dashboard } from '@/types/api';

interface DashboardListProps {
  dashboards: Dashboard[];
  isLoading: boolean;
  error: Error | string | null;
  onRetry: () => void;
  onDelete: (dashboard: Dashboard) => void;
  onDeleteSelected: (rows: Dashboard[]) => void;
}

export function DashboardList({
  dashboards,
  isLoading,
  error,
  onRetry,
  onDelete,
  onDeleteSelected,
}: DashboardListProps) {
  const t = useTranslations();

  const headerAction = (
    <Button asChild disabled={isLoading}>
      <Link href="/dashboard/dashboards/new">
        <RiAddLine className="h-4 w-4" aria-hidden="true" />
        {t('New Dashboard')}
      </Link>
    </Button>
  );

  const header = (
    <PageHeader
      title={t('Dashboards')}
      description={t('Create and manage data visualization dashboards')}
      action={headerAction}
    />
  );

  const columns = useMemo<ColumnDef<Dashboard>[]>(() => {
    return [
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
        cell: ({ row }) => {
          const dashboard = row.original;

          return (
            <div className="min-w-0">
              <Button
                variant="link"
                className="h-auto max-w-full truncate p-0 text-left font-medium text-primary"
                asChild
              >
                <Link href={`/dashboard/dashboards/${dashboard.id}`}>{row.getValue('title')}</Link>
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
          const dashboard = row.original;
          const actions: RowAction[] = [
            {
              label: t('View'),
              icon: <RiDashboardLine className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/dashboards/${dashboard.id}`,
            },
            {
              label: t('Delete'),
              icon: <RiDashboardLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onDelete(dashboard),
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

  if (dashboards.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<RiDashboardLine className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title={t('No Dashboards')}
          description={t('Create your first dashboard to start visualizing data')}
          action={{
            label: t('Create Dashboard'),
            href: '/dashboard/dashboards/new',
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
        data={dashboards}
        searchKey="title"
        searchPlaceholder={t('Search…')}
        enableRowSelection
        onDeleteSelected={onDeleteSelected}
        deleteConfirmTitle={t('Delete Dashboard')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} dashboard(s)? This action cannot be undone',
            {
              count,
            },
          )
        }
        emptyMessage={t('No Dashboards')}
      />
    </div>
  );
}
