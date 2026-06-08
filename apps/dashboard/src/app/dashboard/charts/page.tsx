'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { ChartTableList } from '@/components/charts/table-list';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useResourceList } from '@/hooks/use-resource-list';
import type { Chart } from '@/types/api';
import { useTranslations } from '@/i18n/use-translations';
import { useCharts, useDeleteChart } from '@/lib/api/charts-hooks';
import { useDatasets } from '@/lib/api/datasets-hooks';
import { useCallback, useState } from 'react';

export default function ChartsPage() {
  const t = useTranslations();
  const {
    data: chartsData,
    error: chartsError,
    isLoading: chartsLoading,
    mutate: mutateCharts,
  } = useCharts();
  const { data: datasetsData, error: datasetsError, isLoading: datasetsLoading } = useDatasets();
  const { trigger: deleteChart } = useDeleteChart();
  const { openDialog, dialogState, handleConfirm, handleCancel } = useConfirmDialog();
  const [selectedChartForDashboard, setSelectedChartForDashboard] = useState<number | null>(null);

  const {
    items: charts,
    handleDelete,
    handleBulkDelete,
  } = useResourceList(chartsData, mutateCharts, {
    resourceName: t('Chart'),
    onDelete: async (item) => {
      await deleteChart(item.id);
    },
    onBulkDelete: async (items) => {
      for (const item of items) {
        await deleteChart(item.id);
      }
    },
  });

  const datasets = datasetsData?.items || [];
  const isLoading = chartsLoading || datasetsLoading;
  const error = chartsError || datasetsError;

  const handleDeleteClick = useCallback(
    (chart: Chart) => {
      openDialog({
        title: t('Delete Chart'),
        description: t(`Are you sure to delete '{name}'? This cannot be undone`, {
          name: chart.title,
        }),
        variant: 'destructive',
        onConfirm: () => handleDelete(chart),
      });
    },
    [handleDelete, openDialog, t],
  );

  const closeDashboardSelector = useCallback(() => {
    setSelectedChartForDashboard(null);
  }, []);

  return (
    <div className="space-y-6">
      <ChartTableList
        charts={charts}
        datasets={datasets}
        isLoading={isLoading}
        error={error}
        selectedChartForDashboard={selectedChartForDashboard}
        onRetry={mutateCharts}
        onDelete={handleDeleteClick}
        onDeleteSelected={handleBulkDelete}
        onSelectChartForDashboard={setSelectedChartForDashboard}
        onCloseDashboardSelector={closeDashboardSelector}
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
