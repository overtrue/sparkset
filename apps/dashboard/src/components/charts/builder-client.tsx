'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChartBuilder, type ChartSaveData } from './builder';
import { chartsApi } from '@/lib/api/charts';
import { toast } from 'sonner';
import type { Dataset } from '@/types/chart';

interface ChartBuilderClientProps {
  datasets: Dataset[];
  initialDatasetId?: number;
}

export function ChartBuilderClient({ datasets, initialDatasetId }: ChartBuilderClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: ChartSaveData) => {
    try {
      setIsSaving(true);

      // Create the chart using the API
      await chartsApi.create({
        datasetId: data.datasetId,
        title: data.title,
        description: data.description,
        chartType: data.chartType,
        spec: data.spec,
      });

      toast.success('图表创建成功');
      router.push('/charts');
    } catch (error) {
      toast.error('创建图表失败');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/charts');
  };

  return (
    <ChartBuilder
      datasets={datasets}
      onSave={handleSave}
      onCancel={handleCancel}
      initialDatasetId={initialDatasetId}
    />
  );
}
