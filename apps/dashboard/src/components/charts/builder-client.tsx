'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChartBuilder, type ChartSaveData, type ChartBuilderHandle } from './builder';
import { chartsApi } from '@/lib/api/charts';
import { toast } from 'sonner';
import type { Dataset, ChartSpec } from '@/types/chart';

interface ChartBuilderClientProps {
  datasets: Dataset[];
  initialDatasetId?: number;
  // Edit mode props
  chartId?: number;
  initialSpec?: ChartSpec;
  initialTitle?: string;
  initialDescription?: string;
  // External save trigger
  onReady?: (handle: { submitForm: () => void; isSubmitting: boolean }) => void;
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
  const router = useRouter();
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
        toast.success('图表更新成功');
      } else {
        // Create new chart
        await chartsApi.create({
          datasetId: data.datasetId,
          title: data.title,
          description: data.description,
          chartType: data.chartType,
          spec: data.spec,
        });
        toast.success('图表创建成功');
      }

      router.push('/charts');
    } catch (error) {
      toast.error(chartId ? '更新图表失败' : '创建图表失败');
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
        submitForm: () => builderRef.current?.submitForm(),
        get isSubmitting() {
          return builderRef.current?.isSubmitting || false;
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
