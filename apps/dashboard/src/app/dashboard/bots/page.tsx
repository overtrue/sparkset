'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { BotList } from '@/components/bots/list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useResourceList } from '@/hooks/use-resource-list';
import type { Bot } from '@/types/api';
import { useTranslations } from '@/i18n/use-translations';
import { useBots, useDeleteBot } from '@/lib/api/bots-hooks';

export default function BotsPage() {
  const t = useTranslations();
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

  return (
    <div className="space-y-6">
      <BotList
        bots={bots}
        isLoading={isLoading}
        error={error}
        onRetry={mutate}
        onDelete={handleDeleteClick}
        onDeleteSelected={handleBulkDelete}
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
