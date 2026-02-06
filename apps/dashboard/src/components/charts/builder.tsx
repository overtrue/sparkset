'use client';

import type { ChartConfig } from '@/components/ui/chart';
import { useTranslations } from '@/i18n/use-translations';
import { previewDataset } from '@/lib/api/datasets';
import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { SubmitErrorHandler, SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ChartConfigForm } from './builder-form';
import { ChartPreviewPanel } from './builder-preview';
import {
  categoryRequiresCategoryField,
  categorySupportsMultipleY,
  getCategoryFromVariant,
  getDefaultStyle,
  getDefaultVariant,
} from './registry';
import type { ChartCategory, ChartSpec, ChartStyleConfig, ChartVariant } from './types';
import { getChartColor } from './types';
import { buildConfig, transformData } from './utils';

// ============================================================================
// Types
// ============================================================================

export interface Dataset {
  id: number;
  name: string;
  schemaJson: { name: string; type: string }[];
}

export interface ChartSaveData {
  datasetId: number;
  title: string;
  description?: string;
  chartType: ChartCategory;
  spec: ChartSpec;
}

export interface ChartBuilderHandle {
  submitForm: () => Promise<void>;
  isSubmitting: boolean;
  isValid: boolean;
}

interface ChartBuilderProps {
  datasets: Dataset[];
  onSave: (data: ChartSaveData) => void | Promise<void>;
  initialSpec?: ChartSpec;
  initialDatasetId?: number;
  initialTitle?: string;
  initialDescription?: string;
  autoPreview?: boolean;
  showActions?: boolean;
  onStatusChange?: (status: { isSubmitting: boolean; isValid: boolean }) => void;
}

// ============================================================================
// Form Schema
// ============================================================================

const TITLE_MAX_LENGTH = 128;
const DEFAULT_Y_FIELD = { field: '', agg: 'sum' as const, label: '', color: getChartColor(0) };

const formSchema = z.object({
  datasetId: z.number().min(1, 'Please select a dataset'),
  title: z
    .string()
    .trim()
    .min(1, 'Please enter chart title')
    .max(TITLE_MAX_LENGTH, 'Chart title cannot exceed 128 characters'),
  description: z.string().trim().optional(),
  chartType: z.enum(['area', 'bar', 'line', 'pie', 'radar', 'radial', 'table']),
  variant: z.string().optional(),
  xField: z.string().trim().min(1, 'Please select X-Axis field'),
  yFields: z
    .array(
      z.object({
        field: z.string().trim().min(1, 'Field name cannot be empty'),
        agg: z.enum(['sum', 'avg', 'min', 'max', 'count']),
        label: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .min(1, 'At least one Y-Axis field is required'),
  // Style options
  showLegend: z.boolean().optional(),
  showTooltip: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  stacked: z.boolean().optional(),
  showDots: z.boolean().optional(),
  gradient: z.boolean().optional(),
  horizontal: z.boolean().optional(),
  curveType: z.enum(['monotone', 'linear', 'step', 'natural']).optional(),
  innerRadius: z.number().optional(),
  outerRadius: z.number().optional(),
});

export type ChartBuilderFormData = z.infer<typeof formSchema>;

const buildStyleConfig = (data: ChartBuilderFormData): ChartStyleConfig => ({
  showLegend: data.showLegend,
  showTooltip: data.showTooltip,
  showGrid: data.showGrid,
  stacked: data.stacked,
  showDots: data.showDots,
  gradient: data.gradient,
  horizontal: data.horizontal,
  curveType: data.curveType,
  innerRadius: data.innerRadius,
  outerRadius: data.outerRadius,
});

const buildEncoding = (data: ChartBuilderFormData): ChartSpec['encoding'] => ({
  x: { field: data.xField, type: 'nominal', label: data.xField },
  y: data.yFields.map((y, index) => ({
    field: y.field,
    type: 'quantitative' as const,
    agg: y.agg,
    label: y.label || y.field,
    color: y.color || getChartColor(index),
  })),
});

const buildSpec = (data: ChartBuilderFormData): ChartSpec => ({
  specVersion: '1.0',
  chartType: data.chartType,
  variant: data.variant as ChartVariant,
  encoding: buildEncoding(data),
  style: buildStyleConfig(data),
});

// ============================================================================
// Main Component
// ============================================================================

export const ChartBuilder = React.forwardRef<ChartBuilderHandle, ChartBuilderProps>(
  function ChartBuilder(
    {
      datasets,
      onSave,
      initialSpec,
      initialDatasetId,
      initialTitle,
      initialDescription,
      autoPreview = false,
      showActions = false,
      onStatusChange,
    },
    ref,
  ) {
    const t = useTranslations();
    const formRef = React.useRef<HTMLFormElement>(null);
    const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([]);
    const [previewConfig, setPreviewConfig] = React.useState<ChartConfig>({});
    const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
    const previewRequestIdRef = React.useRef(0);
    const isInitialVariantRunRef = React.useRef(true);
    const shouldApplyVariantDefaultsOnMount = !initialSpec;
    const statusRef = React.useRef<{ isSubmitting: boolean; isValid: boolean } | null>(null);

    // Initialize form with default values
    const defaultChartType = initialSpec?.chartType || 'bar';
    const defaultVariant = initialSpec?.variant || getDefaultVariant(defaultChartType);
    const defaultVariantStyle = getDefaultStyle(defaultVariant);

    const {
      control,
      handleSubmit,
      getValues,
      trigger,
      setValue,
      formState: { errors, isSubmitting, isValid },
    } = useForm<ChartBuilderFormData>({
      mode: 'onChange',
      resolver: zodResolver(formSchema),
      defaultValues: {
        datasetId: initialDatasetId || 0,
        title: initialTitle || '',
        description: initialDescription || '',
        chartType: defaultChartType,
        variant: defaultVariant,
        xField: initialSpec?.encoding?.x?.field || '',
        yFields: initialSpec?.encoding?.y || [DEFAULT_Y_FIELD],
        showLegend: initialSpec?.style?.showLegend ?? defaultVariantStyle.showLegend ?? true,
        showTooltip: initialSpec?.style?.showTooltip ?? defaultVariantStyle.showTooltip ?? true,
        showGrid: initialSpec?.style?.showGrid ?? defaultVariantStyle.showGrid ?? true,
        stacked: initialSpec?.style?.stacked ?? defaultVariantStyle.stacked ?? false,
        showDots: initialSpec?.style?.showDots ?? defaultVariantStyle.showDots ?? false,
        gradient: initialSpec?.style?.gradient ?? defaultVariantStyle.gradient ?? false,
        horizontal: initialSpec?.style?.horizontal ?? defaultVariantStyle.horizontal ?? false,
        curveType:
          initialSpec?.style?.curveType ||
          (defaultVariantStyle.curveType as 'monotone' | 'linear' | 'step' | 'natural') ||
          'monotone',
        innerRadius: initialSpec?.style?.innerRadius ?? defaultVariantStyle.innerRadius ?? 0,
        outerRadius: initialSpec?.style?.outerRadius ?? defaultVariantStyle.outerRadius ?? 80,
      },
    });

    React.useEffect(() => {
      void trigger();
    }, [trigger]);

    const chartType = (useWatch({ control, name: 'chartType' }) ||
      defaultChartType) as ChartCategory;
    const variant = useWatch({ control, name: 'variant' }) as ChartVariant | undefined;
    const datasetId = useWatch({ control, name: 'datasetId' });
    const [
      showLegend,
      showTooltip,
      showGrid,
      stacked,
      showDots,
      gradient,
      horizontal,
      curveType,
      innerRadius,
      outerRadius,
    ] = useWatch({
      control,
      name: [
        'showLegend',
        'showTooltip',
        'showGrid',
        'stacked',
        'showDots',
        'gradient',
        'horizontal',
        'curveType',
        'innerRadius',
        'outerRadius',
      ],
    });

    // Get category config for dynamic options
    const supportsMultipleY = categorySupportsMultipleY(chartType);
    const requiresCategory = categoryRequiresCategoryField(chartType);

    const isFormValid = Boolean(isValid);

    React.useEffect(() => {
      if (!onStatusChange) return;
      if (!statusRef.current) {
        statusRef.current = { isSubmitting, isValid: isFormValid };
        onStatusChange(statusRef.current);
        return;
      }

      const prev = statusRef.current;
      if (prev.isSubmitting === isSubmitting && prev.isValid === isFormValid) {
        return;
      }

      statusRef.current = { isSubmitting, isValid: isFormValid };
      onStatusChange(statusRef.current);
    }, [isSubmitting, isFormValid, onStatusChange]);

    // Submit handler
    const onSubmit = React.useCallback<SubmitHandler<ChartBuilderFormData>>(
      async (data) => {
        try {
          const spec = buildSpec(data);
          await onSave({
            datasetId: data.datasetId,
            title: data.title,
            description: data.description,
            chartType: data.chartType,
            spec,
          });
        } catch (error) {
          toast.error(t('Save failed'));
          console.error(error);
        }
      },
      [onSave, t],
    );

    const handleInvalid = React.useCallback<SubmitErrorHandler<ChartBuilderFormData>>(
      (errors) => {
        const errorMessages: string[] = [];
        Object.keys(errors).forEach((fieldName) => {
          const error = errors[fieldName as keyof typeof errors];
          if (error && typeof error === 'object' && 'message' in error && error.message) {
            errorMessages.push(String(error.message));
          }
        });

        if (errorMessages.length > 0) {
          toast.error(`${t('Please complete the form')}: ${errorMessages.join(', ')}`);
        } else {
          toast.error(t('Please complete the chart configuration'));
        }
      },
      [t],
    );

    const submitForm = React.useCallback(
      () =>
        new Promise<void>((resolve, reject) => {
          void handleSubmit(
            async (data) => {
              try {
                await onSubmit(data);
                resolve();
              } catch (error) {
                reject(error instanceof Error ? error : new Error(String(error)));
              }
            },
            (errors) => {
              handleInvalid(errors);
              reject(new Error(t('Form validation failed')));
            },
          )();
        }),
      [handleSubmit, handleInvalid, onSubmit, t],
    );

    // Expose form submission to parent
    React.useImperativeHandle(
      ref,
      () => ({
        submitForm,
        isSubmitting,
        isValid: isFormValid,
      }),
      [submitForm, isSubmitting, isFormValid],
    );

    const selectedDataset = React.useMemo(
      () => datasets.find((d) => d.id === datasetId) || null,
      [datasets, datasetId],
    );

    React.useEffect(() => {
      if (!datasets.length) return;
      const isValidDataset = datasets.some((dataset) => dataset.id === datasetId);
      if (!isValidDataset) {
        setValue('datasetId', datasets[0].id);
      }
    }, [datasetId, datasets, setValue]);

    // Update variant and style when chart type changes
    // Only reset variant if current variant doesn't belong to the new category
    React.useEffect(() => {
      const currentVariantCategory = variant ? getCategoryFromVariant(variant) : null;

      // Only set new default variant if current variant doesn't match the category
      if (currentVariantCategory !== chartType) {
        const newDefaultVariant = getDefaultVariant(chartType);
        setValue('variant', newDefaultVariant);
        // Note: style will be updated by the variant useEffect below
      }
    }, [chartType, setValue, variant]);

    // Update style fields when variant changes manually (user clicks variant selector)
    React.useEffect(() => {
      if (!variant) return;
      if (isInitialVariantRunRef.current) {
        isInitialVariantRunRef.current = false;
        if (!shouldApplyVariantDefaultsOnMount) {
          return;
        }
      }
      const variantStyle = getDefaultStyle(variant);
      // Reset all style fields to their default values when variant changes
      // Use the variant's default style value, or fall back to sensible defaults
      if (variantStyle.showLegend !== undefined) {
        setValue('showLegend', variantStyle.showLegend);
      }
      if (variantStyle.showTooltip !== undefined) {
        setValue('showTooltip', variantStyle.showTooltip);
      }
      if (variantStyle.showGrid !== undefined) {
        setValue('showGrid', variantStyle.showGrid);
      }
      setValue('horizontal', variantStyle.horizontal ?? false);
      setValue('stacked', variantStyle.stacked ?? false);
      setValue('showDots', variantStyle.showDots ?? false);
      setValue('gradient', variantStyle.gradient ?? false);
      setValue(
        'curveType',
        (variantStyle.curveType as 'monotone' | 'linear' | 'step' | 'natural') ?? 'monotone',
      );
      setValue('innerRadius', variantStyle.innerRadius ?? 0);
      setValue('outerRadius', variantStyle.outerRadius ?? 80);
    }, [shouldApplyVariantDefaultsOnMount, setValue, variant]);

    // Add Y field
    const addYField = React.useCallback(() => {
      const current = getValues('yFields');
      const nextColor = getChartColor(current.length);
      setValue('yFields', [...current, { field: '', agg: 'sum', label: '', color: nextColor }]);
    }, [getValues, setValue]);

    // Generate preview
    const generatePreview = React.useCallback(async () => {
      const formData = getValues();
      const hasValidYFields =
        formData.yFields.length > 0 && formData.yFields.every((y) => y.field.trim().length > 0);

      if (
        formData.datasetId <= 0 ||
        formData.xField.trim().length === 0 ||
        !hasValidYFields ||
        !formData.variant
      ) {
        toast.error(t('Please complete the chart configuration'));
        return;
      }

      const requestId = previewRequestIdRef.current + 1;
      previewRequestIdRef.current = requestId;
      setIsPreviewLoading(true);

      try {
        const result = await previewDataset(formData.datasetId);
        if (previewRequestIdRef.current !== requestId) return;

        const spec = buildSpec(formData);
        const transformedData = transformData(result.rows, spec);
        const config = buildConfig(spec);

        setPreviewData(transformedData);
        setPreviewConfig(config);
        toast.success(t('Preview updated'));
      } catch (error) {
        if (previewRequestIdRef.current === requestId) {
          toast.error(t('Failed to generate preview'));
          console.error(error);
        }
      } finally {
        if (previewRequestIdRef.current === requestId) {
          setIsPreviewLoading(false);
        }
      }
    }, [getValues, t]);

    // Auto-trigger preview on mount for edit mode
    React.useEffect(() => {
      if (!autoPreview || !initialDatasetId || !initialSpec) return;
      const rafId = requestAnimationFrame(() => {
        void generatePreview();
      });
      return () => cancelAnimationFrame(rafId);
    }, [autoPreview, generatePreview, initialDatasetId, initialSpec]);

    // Get current style config for preview
    const previewStyle: ChartStyleConfig = {
      showLegend,
      showTooltip,
      showGrid,
      stacked,
      showDots,
      gradient,
      horizontal,
      curveType,
      innerRadius,
      outerRadius,
    };

    // Get fields by type
    const numericFields = React.useMemo(
      () => selectedDataset?.schemaJson.filter((f) => f.type === 'quantitative') || [],
      [selectedDataset],
    );
    const allFields = React.useMemo(() => selectedDataset?.schemaJson || [], [selectedDataset]);

    const handleSave = React.useCallback(async () => {
      try {
        await submitForm();
      } catch {
        // Error handling is done in submitForm
      }
    }, [submitForm]);

    const handleFormSubmit = React.useCallback<React.FormEventHandler<HTMLFormElement>>(
      (event) => {
        void handleSubmit(onSubmit, handleInvalid)(event);
      },
      [handleSubmit, handleInvalid, onSubmit],
    );

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <ChartConfigForm
          formRef={formRef}
          control={control}
          errors={errors}
          datasets={datasets}
          selectedDataset={selectedDataset}
          chartType={chartType}
          variant={variant}
          setValue={setValue}
          onSubmit={handleFormSubmit}
          requiresCategory={requiresCategory}
          supportsMultipleY={supportsMultipleY}
          numericFields={numericFields}
          allFields={allFields}
          addYField={addYField}
        />

        <ChartPreviewPanel
          chartType={chartType}
          variant={variant}
          previewData={previewData}
          previewConfig={previewConfig}
          previewStyle={previewStyle}
          isPreviewLoading={isPreviewLoading}
          isSubmitting={isSubmitting}
          showActions={showActions}
          onGeneratePreview={generatePreview}
          onSave={handleSave}
        />
      </div>
    );
  },
);
