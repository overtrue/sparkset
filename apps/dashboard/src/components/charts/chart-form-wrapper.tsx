'use client';

import { ChartBuilderClient } from '@/components/charts/builder-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import type { ChartSpec, Dataset } from '@/types/chart';
import { RiSaveLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useCallback, useRef, useState } from 'react';

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
  const builderHandleRef = useRef<{
    submitForm: () => Promise<void>;
    isSubmitting: boolean;
    isValid: boolean;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const handleSave = async () => {
    if (builderHandleRef.current && !builderHandleRef.current.isSubmitting) {
      setIsSaving(true);
      try {
        await builderHandleRef.current.submitForm();
      } catch (error) {
        // Error is already handled in the builder
        console.error('Save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Store handle in ref, not state (to avoid re-renders)
  const onReady = useCallback(
    (handle: { submitForm: () => Promise<void>; isSubmitting: boolean; isValid: boolean }) => {
      builderHandleRef.current = handle;
      setIsFormValid(handle.isValid);
    },
    [],
  );

  const t = useTranslations();
  const handleStatusChange = useCallback((status: { isSubmitting: boolean; isValid: boolean }) => {
    setIsFormValid(status.isValid);
  }, []);

  const title = mode === 'create' ? t('Create Chart') : t('Edit Chart');
  const description =
    mode === 'create'
      ? t('Create a new data visualization chart')
      : t('Modify chart configuration');
  const backLink = mode === 'create' ? '/dashboard/charts' : `/dashboard/charts/${chartId}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        backButton={backLink}
        action={
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            title={!isFormValid ? t('Please fill in complete chart configuration') : ''}
          >
            <RiSaveLine className="h-4 w-4" />
            {isSaving ? t('Saving…') : t('Save')}
          </Button>
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
        onStatusChange={handleStatusChange}
        showActions={false} // Don't show actions in preview panel
      />
    </div>
  );
}
