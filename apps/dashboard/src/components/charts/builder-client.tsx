'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChartBuilder, type ChartSaveData } from './builder';
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
  initialChartType?: 'line' | 'bar' | 'area' | 'pie' | 'table';
}

export function ChartBuilderClient({
  datasets,
  initialDatasetId,
  chartId,
  initialSpec,
  initialTitle,
  initialDescription,
  initialChartType,
}: ChartBuilderClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

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

  const handleCancel = () => {
    router.push('/charts');
  };

  // Pre-fill form data for edit mode
  const getInitialData = () => {
    if (!chartId) return undefined;

    return {
      datasetId: initialDatasetId,
      title: initialTitle || '',
      description: initialDescription || '',
      chartType: initialChartType || 'line',
      xField: initialSpec?.encoding.x?.field || '',
      yFields:
        initialSpec?.encoding.y?.map((y) => ({
          field: y.field,
          agg: y.agg,
          label: y.label,
          color: y.color,
        })) || [],
      showLegend: initialSpec?.style?.showLegend ?? true,
      showTooltip: initialSpec?.style?.showTooltip ?? true,
      showGrid: initialSpec?.style?.showGrid ?? false,
      stacked: initialSpec?.style?.stacked ?? false,
      smooth: initialSpec?.style?.smooth ?? false,
      aspectRatio: initialSpec?.style?.aspectRatio,
    };
  };

  return (
    <ChartBuilder
      datasets={datasets}
      onSave={handleSave}
      onCancel={handleCancel}
      initialDatasetId={initialDatasetId}
      initialSpec={initialSpec}
      initialTitle={initialTitle}
      initialDescription={initialDescription}
    />
  );
}
