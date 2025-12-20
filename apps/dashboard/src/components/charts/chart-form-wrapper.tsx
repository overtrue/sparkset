'use client';

import { useState, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { ChartBuilderClient } from '@/components/charts/builder-client';
import { RiArrowLeftLine, RiSaveLine } from '@remixicon/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Dataset, ChartSpec } from '@/types/chart';

interface ChartFormWrapperProps {
  // Mode: create or edit
  mode: 'create' | 'edit';

  // Required for both modes
  datasets: Dataset[];

  // Edit mode only
  chartId?: number;
  initialDatasetId?: number;
  initialSpec?: ChartSpec;
  initialTitle?: string;
  initialDescription?: string;
}

export function ChartFormWrapper({
  mode,
  datasets,
  chartId,
  initialDatasetId,
  initialSpec,
  initialTitle,
  initialDescription,
}: ChartFormWrapperProps) {
  const builderHandleRef = useRef<{ submitForm: () => void; isSubmitting: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (builderHandleRef.current && !builderHandleRef.current.isSubmitting) {
      setIsSaving(true);
      builderHandleRef.current.submitForm();
      // The saving state will be reset by the builder after save completes
      // But we also set a timeout as a safety measure
      setTimeout(() => setIsSaving(false), 3000);
    }
  };

  // Store handle in ref, not state (to avoid re-renders)
  const onReady = useCallback((handle: { submitForm: () => void; isSubmitting: boolean }) => {
    builderHandleRef.current = handle;
  }, []);

  const title = mode === 'create' ? '创建图表' : '编辑图表';
  const description = mode === 'create' ? '基于数据集配置并创建可视化图表' : '修改图表配置';
  const backLink = mode === 'create' ? '/charts' : `/charts/${chartId}`;
  const backLabel = mode === 'create' ? '返回列表' : '返回详情';

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex gap-2">
            {/* Both create and edit modes show save button in header */}
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <RiSaveLine className="h-4 w-4 mr-2" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={backLink}>
                <RiArrowLeftLine className="h-4 w-4 mr-2" />
                {backLabel}
              </Link>
            </Button>
          </div>
        }
      />

      <ChartBuilderClient
        datasets={datasets}
        initialDatasetId={initialDatasetId}
        chartId={chartId}
        initialSpec={initialSpec}
        initialTitle={initialTitle}
        initialDescription={initialDescription}
        onReady={onReady} // Both modes need onReady for external save trigger
        showActions={false} // Don't show actions in preview panel
      />
    </div>
  );
}
