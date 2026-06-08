'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DashboardList } from '@/components/dashboard/list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useResourceList } from '@/hooks/use-resource-list';
import { useTranslations } from '@/i18n/use-translations';
import { useDashboards, useDeleteDashboard } from '@/lib/api/dashboards-hooks';
import type { Dashboard } from '@/types/api';

export default function DashboardsPage() {
  const t = useTranslations();
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

  return (
    <>
      <DashboardList
        dashboards={dashboards}
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
