'use client';

import { useMemo } from 'react';
import { useTranslations } from '@/i18n/use-translations';
import { Link } from '@/i18n/client-routing';
import { formatDateTime } from '@/lib/utils/date';
import type { Datasource } from '@/types/api';
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
import {
  RiAddLine,
  RiDatabase2Line,
  RiDeleteBinLine,
  RiRefreshLine,
  RiSettings4Line,
} from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';

interface DatasourceListProps {
  datasources: Datasource[];
  isLoading: boolean;
  error: Error | string | null;
  onCreate: () => void;
  onRetry: () => void;
  onSync: (datasource: Datasource) => void;
  onSetDefault: (datasource: Datasource) => void;
  onDelete: (datasource: Datasource) => void;
  onDeleteSelected: (rows: Datasource[]) => void;
}

export function DatasourceList({
  datasources,
  isLoading,
  error,
  onCreate,
  onRetry,
  onSync,
  onSetDefault,
  onDelete,
  onDeleteSelected,
}: DatasourceListProps) {
  const t = useTranslations();

  const columns = useMemo<ColumnDef<Datasource>[]>(() => {
    return [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
        cell: ({ row }) => {
          const datasource = row.original;
          return (
            <Button variant="link" className="h-auto p-0 text-primary font-medium" asChild>
              <Link
                href={`/dashboard/datasources/${datasource.id}`}
                className="flex items-center gap-2 min-w-0"
              >
                <span className="truncate">{row.getValue('name')}</span>
                {datasource.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    {t('Default')}
                  </Badge>
                )}
              </Link>
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
          <span className="text-muted-foreground break-words">
            {row.getValue('host')}:{row.original.port}
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: 'database',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Database')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground break-words">{row.getValue('database')}</span>
        ),
        size: 120,
      },
      {
        accessorKey: 'lastSyncAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Last Sync')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateTime(row.getValue('lastSyncAt'))}
          </span>
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
              icon: <RiDatabase2Line className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/datasources/${datasource.id}`,
            },
            {
              label: t('Sync Tables'),
              icon: <RiRefreshLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onSync(datasource),
            },
            {
              label: t('Set as Default'),
              icon: <RiSettings4Line className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onSetDefault(datasource),
            },
            {
              label: t('Delete'),
              icon: <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onDelete(datasource),
              variant: 'destructive',
            },
          ];

          return <DataTableRowActions actions={actions} />;
        },
        size: 60,
      },
    ];
  }, [onDelete, onSetDefault, onSync, t]);

  const headerAction = (
    <Button onClick={onCreate}>
      <RiAddLine className="h-4 w-4" aria-hidden="true" />
      {t('New Datasource')}
    </Button>
  );

  const header = (
    <PageHeader
      title={t('Datasources')}
      description={t('Manage your database connections')}
      action={headerAction}
    />
  );

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

  if (datasources.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<RiDatabase2Line className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title={t('No Datasources')}
          description={t('Connect to your databases to start querying data')}
          action={{
            label: t('Add your first datasource'),
            onClick: onCreate,
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
        data={datasources}
        searchKey="name"
        searchPlaceholder={t('Search datasource…')}
        enableRowSelection
        onDeleteSelected={onDeleteSelected}
        deleteConfirmTitle={t('Delete Datasource')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} datasource(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No datasources yet, click the button above to add')}
      />
    </div>
  );
}
