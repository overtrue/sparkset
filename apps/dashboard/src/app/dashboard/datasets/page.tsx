'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DatasetList } from '@/components/dataset/list';
import { useDatasets, useDeleteDataset } from '@/lib/api/datasets-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Dataset } from '@/types/api';
import { useTranslations } from '@/i18n/use-translations';

export default function DatasetsPage() {
  const t = useTranslations();
  const { data, error, isLoading, mutate } = useDatasets();
  const { trigger: deleteDataset } = useDeleteDataset();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();

  const {
    items: datasets,
    handleDelete,
    handleBulkDelete,
  } = useResourceList(data, mutate, {
    resourceName: t('Dataset'),
    onDelete: async (item) => {
      await deleteDataset(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteDataset(item.id);
      }
    },
  });

  const handleDeleteClick = (dataset: Dataset) => {
    openDialog({
      title: t('Delete Dataset'),
      description: t(`Are you sure to delete '{name}'? This cannot be undone`, {
        name: dataset.name,
      }),
      variant: 'destructive',
      onConfirm: () => handleDelete(dataset),
    });
  };

  return (
    <>
      <DatasetList
        datasets={datasets}
        isLoading={isLoading}
        error={error as Error | string | null}
        onRetry={() => mutate()}
        onDelete={handleDeleteClick}
        onDeleteSelected={(rows) => {
          void handleBulkDelete(rows);
        }}
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
    </>
  );
}
