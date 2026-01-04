'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/i18n/use-translations';
import { datasetsApi } from '@/lib/api/datasets';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiAddLine, RiDeleteBinLine, RiMagicLine, RiPlayLine } from '@remixicon/react';
import * as React from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ChartSelector, ChartVariantSelector } from './chart-selector';
import {
  categoryRequiresCategoryField,
  categorySupportsMultipleY,
  getCategoryFromVariant,
  getDefaultStyle,
  getDefaultVariant,
} from './registry';
import { ChartRenderer } from './renderer';
import type { ChartCategory, ChartSpec, ChartStyleConfig, ChartVariant } from './types';
import { getChartColor } from './types';
import { buildConfigFromFormData, transformData } from './utils';

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
}

// ============================================================================
// Form Schema
// ============================================================================

const formSchema = z.object({
  datasetId: z.number().min(1, 'Please select a dataset'),
  title: z
    .string()
    .min(1, 'Please enter chart title')
    .max(128, 'Chart title cannot exceed 128 characters'),
  description: z.string().optional(),
  chartType: z.enum(['area', 'bar', 'line', 'pie', 'radar', 'radial', 'table']),
  variant: z.string().optional(),
  xField: z.string().min(1, 'Please select X-Axis field'),
  yFields: z
    .array(
      z.object({
        field: z.string().min(1, 'Field name cannot be empty'),
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

type FormData = z.infer<typeof formSchema>;

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
    },
    ref,
  ) {
    const t = useTranslations();
    const formRef = React.useRef<HTMLFormElement>(null);
    const [previewData, setPreviewData] = React.useState<Record<string, unknown>[]>([]);
    const [previewConfig, setPreviewConfig] = React.useState<ChartConfig>({});
    const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
    const [selectedDataset, setSelectedDataset] = React.useState<Dataset | null>(null);

    // Initialize form with default values
    const defaultChartType = initialSpec?.chartType || 'bar';
    const defaultVariant = initialSpec?.variant || getDefaultVariant(defaultChartType);

    const {
      control,
      handleSubmit,
      watch,
      setValue,
      formState: { errors, isSubmitting },
    } = useForm<FormData>({
      mode: 'onChange',
      resolver: zodResolver(formSchema),
      defaultValues: {
        datasetId: initialDatasetId || 0,
        title: initialTitle || '',
        description: initialDescription || '',
        chartType: defaultChartType,
        variant: defaultVariant,
        xField: initialSpec?.encoding?.x?.field || '',
        yFields: initialSpec?.encoding?.y || [
          { field: '', agg: 'sum', label: '', color: getChartColor(0) },
        ],
        showLegend: initialSpec?.style?.showLegend ?? true,
        showTooltip: initialSpec?.style?.showTooltip ?? true,
        showGrid: initialSpec?.style?.showGrid ?? true,
        stacked: initialSpec?.style?.stacked ?? false,
        showDots: initialSpec?.style?.showDots ?? false,
        gradient: initialSpec?.style?.gradient ?? false,
        horizontal: initialSpec?.style?.horizontal ?? false,
        curveType: initialSpec?.style?.curveType || 'monotone',
        innerRadius: initialSpec?.style?.innerRadius ?? 60,
        outerRadius: initialSpec?.style?.outerRadius ?? 80,
      },
    });

    const chartType = watch('chartType');
    const variant = watch('variant') as ChartVariant | undefined;
    const datasetId = watch('datasetId');
    const yFields = watch('yFields');
    const title = watch('title');
    const xField = watch('xField');

    // Get category config for dynamic options
    const supportsMultipleY = categorySupportsMultipleY(chartType);
    const requiresCategory = categoryRequiresCategoryField(chartType);

    // Calculate form validity
    const yFieldsKey = React.useMemo(() => JSON.stringify(yFields), [yFields]);
    const isFormValid = React.useMemo(() => {
      return (
        datasetId > 0 &&
        title.trim().length > 0 &&
        title.trim().length <= 128 &&
        xField.trim().length > 0 &&
        yFields.length > 0 &&
        yFields.every((y) => y.field && y.field.trim().length > 0)
      );
    }, [datasetId, title, xField, yFieldsKey]);

    // Submit handler
    const onSubmit = React.useCallback<SubmitHandler<FormData>>(
      async (data) => {
        try {
          const style: ChartStyleConfig = {
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
          };

          const spec: ChartSpec = {
            specVersion: '1.0',
            chartType: data.chartType,
            variant: data.variant as ChartVariant,
            encoding: {
              x: { field: data.xField, type: 'nominal', label: data.xField },
              y: data.yFields.map((y, index) => ({
                field: y.field,
                type: 'quantitative' as const,
                agg: y.agg,
                label: y.label || y.field,
                color: y.color || getChartColor(index),
              })),
            },
            style,
          };

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

    // Expose form submission to parent
    React.useImperativeHandle(
      ref,
      () => ({
        submitForm: async () => {
          return new Promise<void>((resolve, reject) => {
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
                reject(new Error(t('Form validation failed')));
              },
            )();
          });
        },
        isSubmitting,
        isValid: isFormValid,
      }),
      [handleSubmit, onSubmit, isSubmitting, isFormValid, t],
    );

    // Load dataset schema when selected
    React.useEffect(() => {
      if (datasetId) {
        const dataset = datasets.find((d) => d.id === datasetId);
        setSelectedDataset(dataset || null);
      } else {
        setSelectedDataset(null);
      }
    }, [datasetId, datasets]);

    // Auto-trigger preview on mount for edit mode
    React.useEffect(() => {
      if (autoPreview && initialDatasetId && initialSpec) {
        setTimeout(() => {
          void generatePreview();
        }, 100);
      }
    }, [autoPreview, initialDatasetId, initialSpec]);

    // Update variant and style when chart type changes
    // Only reset variant if current variant doesn't belong to the new category
    React.useEffect(() => {
      const currentVariant = watch('variant') as ChartVariant | undefined;
      // Check if current variant belongs to the new chart type
      const currentVariantCategory = currentVariant ? getCategoryFromVariant(currentVariant) : null;

      // Only set new default variant if current variant doesn't match the category
      if (currentVariantCategory !== chartType) {
        const newDefaultVariant = getDefaultVariant(chartType);
        setValue('variant', newDefaultVariant);
        // Note: style will be updated by the variant useEffect below
      }
    }, [chartType, setValue, watch]);

    // Update style fields when variant changes manually (user clicks variant selector)
    React.useEffect(() => {
      if (variant) {
        const variantStyle = getDefaultStyle(variant);
        // Reset all style fields to their default values when variant changes
        // Use the variant's default style value, or fall back to sensible defaults
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
      }
    }, [variant, setValue]);

    // Add Y field
    const addYField = () => {
      const current = watch('yFields');
      const nextColor = getChartColor(current.length);
      setValue('yFields', [...current, { field: '', agg: 'sum', label: '', color: nextColor }]);
    };

    // Generate preview
    const generatePreview = async () => {
      const formData = watch();

      if (!formData.datasetId || !formData.xField || formData.yFields.length === 0) {
        toast.error(t('Please complete the chart configuration'));
        return;
      }

      setIsPreviewLoading(true);

      try {
        const result = await datasetsApi.preview(formData.datasetId);

        // Build spec for transformation
        const spec: ChartSpec = {
          specVersion: '1.0',
          chartType: formData.chartType,
          variant: formData.variant as ChartVariant,
          encoding: {
            x: { field: formData.xField, type: 'nominal' },
            y: formData.yFields.map((y) => ({
              field: y.field,
              type: 'quantitative' as const,
              agg: y.agg,
              label: y.label || y.field,
              color: y.color,
            })),
          },
        };

        const transformedData = transformData(result.rows, spec);
        const config = buildConfigFromFormData(formData.yFields);

        setPreviewData(transformedData);
        setPreviewConfig(config);
        toast.success(t('Preview updated'));
      } catch (error) {
        toast.error(t('Failed to generate preview'));
        console.error(error);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    // Get aspect ratio class based on chart type
    const getChartAspectClass = (type: ChartCategory): string => {
      switch (type) {
        case 'pie':
        case 'radar':
        case 'radial':
          return 'aspect-square h-[350px]';
        case 'table':
          return 'min-h-[200px]';
        default:
          return 'aspect-[16/9] h-[350px]';
      }
    };

    // Get current style config for preview
    const previewStyle: ChartStyleConfig = {
      showLegend: watch('showLegend'),
      showTooltip: watch('showTooltip'),
      showGrid: watch('showGrid'),
      stacked: watch('stacked'),
      showDots: watch('showDots'),
      gradient: watch('gradient'),
      horizontal: watch('horizontal'),
      curveType: watch('curveType'),
      innerRadius: watch('innerRadius'),
      outerRadius: watch('outerRadius'),
    };

    // Get fields by type
    const numericFields =
      selectedDataset?.schemaJson.filter((f) => f.type === 'quantitative') || [];
    const allFields = selectedDataset?.schemaJson || [];

    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('Chart Configuration')}</CardTitle>
              <CardDescription>
                {t('Configure chart data source and display options')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                ref={formRef}
                onSubmit={(e) => {
                  void handleSubmit(onSubmit)(e);
                }}
                className="space-y-4"
              >
                {/* Dataset Selection */}
                <div className="space-y-2">
                  <Label>{t('Dataset')}</Label>
                  <Controller
                    name="datasetId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value.toString()}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select dataset')} />
                        </SelectTrigger>
                        <SelectContent>
                          {datasets.map((dataset) => (
                            <SelectItem key={dataset.id} value={dataset.id.toString()}>
                              {dataset.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.datasetId && (
                    <p className="text-sm text-destructive">{errors.datasetId.message}</p>
                  )}
                </div>

                {/* Title & Description */}
                <div className="space-y-2">
                  <Label>{t('Chart Title')}</Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Input
                          {...field}
                          placeholder={t('e.g.: Sales Trend Analysis')}
                          maxLength={128}
                        />
                        <div className="flex items-center justify-between">
                          {errors.title && (
                            <p className="text-sm text-destructive">{errors.title.message}</p>
                          )}
                          <p className="ml-auto text-xs text-muted-foreground">
                            {field.value?.length || 0}/128
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Description (optional)')}</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder={t('Describe what this chart shows')}
                        rows={2}
                      />
                    )}
                  />
                </div>

                <Separator />

                {/* Chart Type Selection */}
                <div className="space-y-2">
                  <Label>{t('Chart Type')}</Label>
                  <Controller
                    name="chartType"
                    control={control}
                    render={({ field }) => (
                      <ChartSelector
                        value={variant}
                        onChange={(newVariant, newCategory) => {
                          field.onChange(newCategory);
                          setValue('variant', newVariant);
                        }}
                      />
                    )}
                  />
                </div>

                {/* Chart Variant Selection */}
                <div className="space-y-2">
                  <Label>{t('Chart Style')}</Label>
                  <Controller
                    name="variant"
                    control={control}
                    render={({ field }) => (
                      <ChartVariantSelector
                        category={chartType}
                        value={field.value as ChartVariant}
                        onChange={(v) => field.onChange(v)}
                      />
                    )}
                  />
                </div>

                <Separator />

                {/* Dataset Schema */}
                {selectedDataset && (
                  <div className="space-y-2 rounded-md bg-muted/50 p-3">
                    <Label className="text-xs text-muted-foreground">{t('Available Fields')}</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedDataset.schemaJson.map((field) => (
                        <Badge key={field.name} variant="secondary" className="text-xs">
                          {field.name} ({field.type === 'quantitative' ? 'num' : 'str'})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* X Field */}
                <div className="space-y-2">
                  <Label>{requiresCategory ? t('Category Field') : t('X-Axis Field')}</Label>
                  <Controller
                    name="xField"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              requiresCategory
                                ? t('Select category field')
                                : t('Select X-Axis field')
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {allFields.map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.xField && (
                    <p className="text-sm text-destructive">{errors.xField.message}</p>
                  )}
                </div>

                {/* Y Fields */}
                <div className="space-y-2">
                  <Label>{requiresCategory ? t('Value Field') : t('Y-Axis Field')}</Label>
                  <Controller
                    name="yFields"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        {field.value.map((yField, index) => (
                          <div key={index} className="rounded-md border bg-muted/30 p-3">
                            <div className="flex items-center gap-2">
                              {/* Field selector */}
                              <Select
                                value={yField.field}
                                onValueChange={(val) => {
                                  const updated = [...field.value];
                                  updated[index] = { ...updated[index], field: val };
                                  field.onChange(updated);
                                }}
                              >
                                <SelectTrigger className="h-9 flex-1">
                                  <SelectValue placeholder={t('Select field')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {numericFields.map((f) => (
                                    <SelectItem key={f.name} value={f.name}>
                                      {f.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {/* Aggregation selector */}
                              <Select
                                value={yField.agg}
                                onValueChange={(val) => {
                                  const updated = [...field.value];
                                  updated[index] = {
                                    ...updated[index],
                                    agg: val as 'sum' | 'avg' | 'min' | 'max' | 'count',
                                  };
                                  field.onChange(updated);
                                }}
                              >
                                <SelectTrigger className="h-9 w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="sum">{t('Sum')}</SelectItem>
                                  <SelectItem value="avg">{t('Average')}</SelectItem>
                                  <SelectItem value="min">{t('Min')}</SelectItem>
                                  <SelectItem value="max">{t('Max')}</SelectItem>
                                  <SelectItem value="count">{t('Count')}</SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Delete button */}
                              {supportsMultipleY && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    const updated = field.value.filter((_, i) => i !== index);
                                    field.onChange(updated);
                                  }}
                                  disabled={field.value.length <= 1}
                                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                >
                                  <RiDeleteBinLine className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            {/* Label input - only show for multiple Y fields */}
                            {supportsMultipleY && field.value.length > 1 && (
                              <div className="mt-2">
                                <Input
                                  placeholder={t('Display label (optional)')}
                                  value={yField.label || ''}
                                  onChange={(e) => {
                                    const updated = [...field.value];
                                    updated[index] = { ...updated[index], label: e.target.value };
                                    field.onChange(updated);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        ))}

                        {supportsMultipleY && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addYField}
                            className="w-full"
                          >
                            <RiAddLine className="h-4 w-4" />
                            {t('Add Field')}
                          </Button>
                        )}
                      </div>
                    )}
                  />
                  {errors.yFields && (
                    <p className="text-sm text-destructive">{errors.yFields.message}</p>
                  )}
                </div>

                <Separator />

                {/* Style Options */}
                <div className="space-y-3">
                  <Label>{t('Display Options')}</Label>

                  <div className="grid grid-cols-2 gap-2">
                    <Controller
                      name="showLegend"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          {t('Show Legend')}
                        </label>
                      )}
                    />

                    <Controller
                      name="showTooltip"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          {t('Show Tooltip')}
                        </label>
                      )}
                    />

                    {['area', 'bar', 'line'].includes(chartType) && (
                      <Controller
                        name="showGrid"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            {t('Show Grid')}
                          </label>
                        )}
                      />
                    )}

                    {['area', 'bar'].includes(chartType) && (
                      <Controller
                        name="stacked"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            {t('Stacked')}
                          </label>
                        )}
                      />
                    )}

                    {['area', 'line'].includes(chartType) && (
                      <Controller
                        name="showDots"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            {t('Show Dots')}
                          </label>
                        )}
                      />
                    )}

                    {chartType === 'area' && (
                      <Controller
                        name="gradient"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            {t('Gradient Fill')}
                          </label>
                        )}
                      />
                    )}

                    {chartType === 'bar' && (
                      <Controller
                        name="horizontal"
                        control={control}
                        render={({ field }) => (
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            {t('Horizontal')}
                          </label>
                        )}
                      />
                    )}
                  </div>

                  {/* Curve Type for Line/Area */}
                  {['area', 'line'].includes(chartType) && (
                    <div className="space-y-2">
                      <Label className="text-xs">{t('Curve Type')}</Label>
                      <Controller
                        name="curveType"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monotone">{t('Smooth')}</SelectItem>
                              <SelectItem value="linear">{t('Linear')}</SelectItem>
                              <SelectItem value="step">{t('Step')}</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  )}

                  {/* Pie/Radial specific options */}
                  {['pie', 'radial'].includes(chartType) && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('Inner Radius')}</Label>
                        <Controller
                          name="innerRadius"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-8"
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('Outer Radius')}</Label>
                        <Controller
                          name="outerRadius"
                          control={control}
                          render={({ field }) => (
                            <Input
                              type="number"
                              min="0"
                              max="150"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="h-8"
                            />
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>{t('Live Preview')}</CardTitle>
                <CardDescription>{t('View chart effect')}</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePreview}
                disabled={isPreviewLoading}
              >
                <RiPlayLine className="h-4 w-4" />
                {isPreviewLoading ? t('Executing...') : t('Generate Preview')}
              </Button>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 && Object.keys(previewConfig).length > 0 ? (
                <div className={cn('w-full', getChartAspectClass(chartType))}>
                  <ChartRenderer
                    chartType={chartType}
                    variant={variant}
                    data={previewData}
                    config={previewConfig}
                    style={previewStyle}
                    className="h-full w-full"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground',
                    getChartAspectClass(chartType),
                  )}
                >
                  <div className="text-center">
                    <RiMagicLine className="mx-auto mb-2 h-12 w-12 opacity-50" />
                    <p>{t('Configure chart and generate preview')}</p>
                  </div>
                </div>
              )}
            </CardContent>
            {showActions && (
              <div className="flex gap-2 p-4 pt-0">
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await handleSubmit(onSubmit)();
                    } catch {
                      // Error handling is done in handleSubmit
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <RiMagicLine className="h-4 w-4" />
                  {isSubmitting ? t('Saving...') : t('Save Chart')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  },
);
