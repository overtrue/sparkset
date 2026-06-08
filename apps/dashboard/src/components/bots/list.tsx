'use client';

import { useMemo } from 'react';
import { RiAddLine, RiDeleteBinLine, RiEdit2Line, RiRobot2Line } from '@remixicon/react';
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
import type { Bot } from '@/types/api';

const PLATFORM_LABELS: Record<string, string> = {
  wecom: 'WeChat Work',
  discord: 'Discord',
  slack: 'Slack',
  telegram: 'Telegram',
  custom: 'Custom',
};

interface BotListProps {
  bots: Bot[];
  isLoading: boolean;
  error: Error | string | null;
  onRetry: () => void;
  onDelete: (bot: Bot) => void;
  onDeleteSelected: (rows: Bot[]) => void;
}

export function BotList({
  bots,
  isLoading,
  error,
  onRetry,
  onDelete,
  onDeleteSelected,
}: BotListProps) {
  const t = useTranslations();

  const headerAction = (
    <Button asChild disabled={isLoading}>
      <Link href="/dashboard/bots/new">
        <RiAddLine className="h-4 w-4" aria-hidden="true" />
        {t('New Bot')}
      </Link>
    </Button>
  );

  const header = (
    <PageHeader title={t('Bots')} description={t('Manage your AI bots')} action={headerAction} />
  );

  const columns = useMemo<ColumnDef<Bot>[]>(() => {
    return [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
        cell: ({ row }) => {
          const bot = row.original;

          return (
            <div className="min-w-0">
              <Button
                variant="link"
                className="h-auto max-w-full truncate p-0 text-left font-medium text-primary"
                asChild
              >
                <Link href={`/dashboard/bots/${bot.id}`}>{row.getValue('name')}</Link>
              </Button>
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Platform')} />,
        cell: ({ row }) => {
          const platform = row.original.type;

          return <Badge variant="outline">{PLATFORM_LABELS[platform] || platform}</Badge>;
        },
        size: 120,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
        cell: ({ row }) => (
          <span className="break-words text-sm text-muted-foreground">
            {row.getValue('description') || '-'}
          </span>
        ),
        size: 200,
      },
      {
        accessorKey: 'enableQuery',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Query')} />,
        cell: ({ row }) => {
          const enabled = row.getValue('enableQuery');

          return enabled ? (
            <Badge variant="secondary">{t('Enabled')}</Badge>
          ) : (
            <Badge variant="outline">{t('Disabled')}</Badge>
          );
        },
        size: 100,
      },
      {
        id: 'enabledActionsCount',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('Enabled Actions')} />
        ),
        cell: ({ row }) => {
          const bot = row.original;

          return (
            <span className="text-sm text-muted-foreground">{bot.enabledActions?.length || 0}</span>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Created')} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(row.getValue('createdAt'))}
          </span>
        ),
        size: 180,
      },
      {
        id: 'rowActions',
        header: () => <span className="sr-only">{t('Actions')}</span>,
        cell: ({ row }) => {
          const bot = row.original;
          const actions: RowAction[] = [
            {
              label: t('View Details'),
              icon: <RiRobot2Line className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/bots/${bot.id}`,
            },
            {
              label: t('Edit'),
              icon: <RiEdit2Line className="h-4 w-4" aria-hidden="true" />,
              href: `/dashboard/bots/${bot.id}/edit`,
            },
            {
              label: t('Delete'),
              icon: <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />,
              onClick: () => onDelete(bot),
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

  if (bots.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={<RiRobot2Line className="h-8 w-8 text-muted-foreground" aria-hidden="true" />}
          title={t('No Bots')}
          description={t('Create your first bot to get started')}
          action={{
            label: t('Create Your First Bot'),
            href: '/dashboard/bots/new',
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
        data={bots}
        searchKey="name"
        searchPlaceholder={t('Search bots…')}
        enableRowSelection
        onDeleteSelected={onDeleteSelected}
        deleteConfirmTitle={t('Delete Bots')}
        deleteConfirmDescription={(count) =>
          t('Are you sure to delete the selected {count} bot(s)? This action cannot be undone', {
            count,
          })
        }
        emptyMessage={t('No bots yet, click the button above to add')}
      />
    </div>
  );
}
