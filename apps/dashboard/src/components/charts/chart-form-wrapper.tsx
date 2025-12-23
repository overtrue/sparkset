'use client';

import { ChartBuilderClient } from '@/components/charts/builder-client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import type { ChartSpec, Dataset } from '@/types/chart';
import { RiArrowLeftLine, RiSaveLine } from '@remixicon/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';
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

  // Update form validity state periodically
  // Since refs don't trigger re-renders, we poll the validity state
  const formValidityRef = useRef(false);
  const t = useTranslations();

  React.useEffect(() => {
    const interval = setInterval(() => {
      if (builderHandleRef.current) {
        const currentValid = builderHandleRef.current.isValid;
        if (currentValid !== formValidityRef.current) {
          formValidityRef.current = currentValid;
          setIsFormValid(currentValid);
        }
      }
    }, 300); // Check every 300ms

    return () => clearInterval(interval);
  }, []);

  const title = mode === 'create' ? t('Create Chart') : t('Edit Chart');
  const description =
    mode === 'create'
      ? t('Create a new data visualization chart')
      : t('Modify chart configuration');
  const backLink = mode === 'create' ? '/charts' : `/charts/${chartId}`;
  const backLabel = mode === 'create' ? t('Back to list') : t('Back to details');

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        action={
          <div className="flex gap-2">
            {/* Both create and edit modes show save button in header */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
              title={!isFormValid ? t('Please fill in complete chart configuration') : ''}
            >
              <RiSaveLine className="h-4 w-4" />
              {isSaving ? t('Saving') : t('Save')}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={backLink}>
                <RiArrowLeftLine className="h-4 w-4" />
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
