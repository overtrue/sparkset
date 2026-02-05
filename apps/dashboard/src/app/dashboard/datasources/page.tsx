'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { CreateDatasourceDialog } from '@/components/datasource/create-dialog';
import { DatasourceList } from '@/components/datasource/list';
import {
  useDatasources,
  useDeleteDatasource,
  useSetDefaultDatasource,
  useSyncDatasource,
} from '@/lib/api/datasources-hooks';
import { useResourceList } from '@/hooks/use-resource-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type { Datasource } from '@/types/api';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';
import { useState } from 'react';

export default function DatasourcesPage() {
  const t = useTranslations();
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

  return (
    <>
      <DatasourceList
        datasources={datasources}
        isLoading={isLoading}
        error={error as Error | string | null}
        onCreate={handleCreateNew}
        onRetry={() => mutate()}
        onSync={handleSync}
        onSetDefault={handleSetDefault}
        onDelete={handleDeleteClick}
        onDeleteSelected={(rows) => {
          void handleBulkDelete(rows);
        }}
      />
      <CreateDatasourceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleDatasourceCreated}
      />
      {dialogState && (
        <ConfirmDialog
          open={dialogState.open}
          onOpenChange={(open) => {
            if (!open) handleCancel();
          }}
          title={dialogState.title}
          description={dialogState.description}
          confirmText={dialogState.confirmText}
          cancelText={dialogState.cancelText}
          onConfirm={handleConfirm}
          variant={dialogState.variant}
        />
      )}
    </>
  );
}
