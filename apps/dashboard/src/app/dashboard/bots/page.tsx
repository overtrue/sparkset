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
import { useBots, useDeleteBot } from '@/lib/api/bots-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Bot } from '@/types/api';
import { RiAddLine, RiDeleteBinLine, RiEdit2Line, RiRobot2Line } from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';

const PLATFORM_LABELS: Record<string, string> = {
  wecom: 'WeChat Work',
  discord: 'Discord',
  slack: 'Slack',
  telegram: 'Telegram',
};

export default function BotsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { data, error, isLoading, mutate } = useBots(1, 10);
  const { trigger: deleteBot } = useDeleteBot();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  const {
    items: bots,
    handleDelete,
    handleBulkDelete,
  } = useResourceList({ items: data?.items || [] }, mutate, {
    resourceName: t('Bot'),
    onDelete: async (item) => {
      await deleteBot(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteBot(item.id);
      }
    },
  });

  const handleDeleteClick = (bot: Bot) => {
    openDialog({
      title: t('Delete Bot'),
      description: t(`Are you sure to delete '{name}'? This cannot be undone`, {
        name: bot.name,
      }),
      variant: 'destructive',
      onConfirm: () => handleDelete(bot),
    });
  };

  const handleCreateNew = () => {
    router.push('/dashboard/bots/new');
  };

  const handleViewDetails = (bot: Bot) => {
    router.push(`/dashboard/bots/${bot.id}`);
  };

  const handleEdit = (bot: Bot) => {
    router.push(`/dashboard/bots/${bot.id}/edit`);
  };

  const formatDate = (value: string) => formatDateTime(value);

  const columns: ColumnDef<Bot>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => {
        const bot = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-primary font-medium"
            onClick={() => handleViewDetails(bot)}
          >
            {row.getValue('name')}
          </Button>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'platform',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Platform')} />,
      cell: ({ row }) => {
        const platform = row.original.platform;
        return <Badge variant="outline">{PLATFORM_LABELS[platform] || platform}</Badge>;
      },
      size: 120,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.getValue('description') || '-'}</span>
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
          <span className="text-muted-foreground text-sm">{bot.enabledActions?.length || 0}</span>
        );
      },
      size: 100,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Created')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.getValue('createdAt'))}
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
            icon: <RiRobot2Line className="h-4 w-4" />,
            onClick: () => handleViewDetails(bot),
          },
          {
            label: t('Edit'),
            icon: <RiEdit2Line className="h-4 w-4" />,
            onClick: () => handleEdit(bot),
          },
          {
            label: t('Delete'),
            icon: <RiDeleteBinLine className="h-4 w-4" />,
            onClick: () => handleDeleteClick(bot),
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
          title={t('Bots')}
          description={t('Manage your AI bots')}
          action={
            <Button onClick={handleCreateNew} disabled>
              <RiAddLine className="h-4 w-4" />
              {t('New Bot')}
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
          title={t('Bots')}
          description={t('Manage your AI bots')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Bot')}
            </Button>
          }
        />
        <ErrorState error={error} onRetry={() => mutate()} />
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Bots')}
          description={t('Manage your AI bots')}
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4" />
              {t('New Bot')}
            </Button>
          }
        />
        <EmptyState
          icon={<RiRobot2Line className="h-8 w-8 text-muted-foreground" />}
          title={t('No Bots')}
          description={t('Create your first bot to get started')}
          action={{
            label: t('Create your first bot'),
            onClick: handleCreateNew,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Bots')}
        description={t('Manage your AI bots')}
        action={
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4" />
            {t('New Bot')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={bots}
        searchKey="name"
        searchPlaceholder={t('Search bots...')}
        enableRowSelection
        onDeleteSelected={handleBulkDelete}
        deleteConfirmTitle={t('Delete Bots')}
        deleteConfirmDescription={(count) =>
          t('Are you sure to delete the selected {count} bot(s)? This action cannot be undone', {
            count,
          })
        }
        emptyMessage={t('No bots yet, click the button above to add')}
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
