'use client';

import { chartsApi } from '@/lib/api/charts';
import type { ChartSpec, Dataset } from '@/types/chart';
import { useTranslations } from '@/i18n/use-translations';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChartBuilder, type ChartBuilderHandle, type ChartSaveData } from './builder';

interface ChartBuilderClientProps {
  datasets: Dataset[];
  initialDatasetId?: number;
  // Edit mode props
  chartId?: number;
  initialSpec?: ChartSpec;
  initialTitle?: string;
  initialDescription?: string;
  // External save trigger
  onReady?: (handle: {
    submitForm: () => Promise<void>;
    isSubmitting: boolean;
    isValid: boolean;
  }) => void;
  // Show action buttons in preview panel
  showActions?: boolean;
}

export function ChartBuilderClient({
  datasets,
  initialDatasetId,
  chartId,
  initialSpec,
  initialTitle,
  initialDescription,
  onReady,
  showActions = false,
}: ChartBuilderClientProps) {
  const t = useTranslations();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSaving, setIsSaving] = useState(false);
  const builderRef = useRef<ChartBuilderHandle>(null);

  const handleSave = async (data: ChartSaveData) => {
    try {
      setIsSaving(true);

      if (chartId) {
        // Update existing chart
        await chartsApi.update(chartId, {
          datasetId: data.datasetId,
          title: data.title,
          description: data.description,
          chartType: data.chartType,
          spec: data.spec,
        });
        toast.success(t('Chart updated successfully'));
      } else {
        // Create new chart
        await chartsApi.create({
          datasetId: data.datasetId,
          title: data.title,
          description: data.description,
          chartType: data.chartType,
          spec: data.spec,
        });
        toast.success(t('Chart created successfully'));
      }

      router.push('/dashboard/charts');
    } catch (error) {
      toast.error(chartId ? t('Failed to update chart') : t('Failed to create chart'));
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Expose submitForm to parent - only once
  const onReadyCalled = useRef(false);
  useEffect(() => {
    if (onReady && builderRef.current && !onReadyCalled.current) {
      onReadyCalled.current = true;
      onReady({
        submitForm: () => builderRef.current?.submitForm() || Promise.resolve(),
        get isSubmitting() {
          return builderRef.current?.isSubmitting || false;
        },
        get isValid() {
          return builderRef.current?.isValid || false;
        },
      });
    }
  }, [onReady]);

  return (
    <ChartBuilder
      ref={builderRef}
      datasets={datasets}
      onSave={handleSave}
      initialDatasetId={initialDatasetId}
      initialSpec={initialSpec}
      initialTitle={initialTitle}
      initialDescription={initialDescription}
      autoPreview={!!chartId} // Auto-preview in edit mode
      showActions={showActions} // Show actions in preview panel for new chart
    />
  );
}
