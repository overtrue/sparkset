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
import { Textarea } from '@/components/ui/textarea';
import { datasetsApi } from '@/lib/api/datasets';
import type { ChartSpec, Dataset } from '@/types/chart';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiAddLine, RiDeleteBinLine, RiMagicLine, RiPlayLine } from '@remixicon/react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ChartRenderer } from './renderer';

// Form validation schema
const formSchema = z.object({
  datasetId: z.number().min(1, 'Please select a dataset'),
  title: z
    .string()
    .min(1, 'Please enter chart title')
    .max(128, 'Chart title cannot exceed 128 characters'),
  description: z.string().optional(),
  chartType: z.enum(['line', 'bar', 'area', 'pie', 'table']),
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
  showLegend: z.boolean().optional(),
  showTooltip: z.boolean().optional(),
  showGrid: z.boolean().optional(),
  stacked: z.boolean().optional(),
  smooth: z.boolean().optional(),
  aspectRatio: z.number().min(0.5).max(3).optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface ChartSaveData {
  datasetId: number;
  title: string;
  description?: string;
  chartType: 'line' | 'bar' | 'area' | 'pie' | 'table';
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
  autoPreview?: boolean; // Auto-trigger preview on mount
  showActions?: boolean; // Show action buttons in preview panel
}

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
    const [previewData, setPreviewData] = React.useState<unknown[]>([]);
    const [previewConfig, setPreviewConfig] = React.useState<ChartConfig>({});
    const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
    const [selectedDataset, setSelectedDataset] = React.useState<Dataset | null>(null);

    const {
      control,
      handleSubmit,
      watch,
      setValue,
      formState: { errors, isSubmitting, isValid },
    } = useForm<FormData>({
      mode: 'onChange', // Real-time validation
      resolver: zodResolver(formSchema),
      defaultValues: {
        datasetId: initialDatasetId || 0,
        title: initialTitle || initialSpec?.encoding?.x?.label || '',
        description: initialDescription || '',
        chartType: initialSpec?.chartType || 'line',
        xField: initialSpec?.encoding?.x?.field || '',
        yFields: initialSpec?.encoding?.y || [
          { field: '', agg: 'sum', label: '', color: 'var(--chart-1)' },
        ],
        showLegend: initialSpec?.style?.showLegend ?? true,
        showTooltip: initialSpec?.style?.showTooltip ?? true,
        showGrid: initialSpec?.style?.showGrid ?? true,
        stacked: initialSpec?.style?.stacked ?? false,
        smooth: initialSpec?.style?.smooth ?? false,
        aspectRatio: initialSpec?.style?.aspectRatio ?? 1.5,
      },
    });

    const chartType = watch('chartType');
    const datasetId = watch('datasetId');
    const yFields = watch('yFields');
    const title = watch('title');
    const xField = watch('xField');

    // Calculate form validity manually based on actual values
    // This is more reliable than isValid which may require all fields to be "touched"
    // Use JSON.stringify for yFields to detect deep changes in array
    const yFieldsKey = React.useMemo(() => JSON.stringify(yFields), [yFields]);
    const isFormValid = React.useMemo(() => {
      const valid =
        datasetId > 0 &&
        title.trim().length > 0 &&
        title.trim().length <= 128 &&
        xField.trim().length > 0 &&
        yFields.length > 0 &&
        yFields.every((y) => y.field && y.field.trim().length > 0);

      // Debug logging (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Form validity check:', {
          datasetId,
          title: title.trim(),
          titleLength: title.trim().length,
          xField: xField.trim(),
          xFieldLength: xField.trim().length,
          yFields,
          yFieldsKey,
          yFieldsValid: yFields.every((y) => y.field && y.field.trim().length > 0),
          isValid: valid,
        });
      }

      return valid;
    }, [datasetId, title, xField, yFieldsKey]);

    // Submit handler - defined before useImperativeHandle
    const onSubmit = React.useCallback<SubmitHandler<FormData>>(
      async (data) => {
        try {
          const spec: ChartSpec = {
            specVersion: '1.0',
            chartType: data.chartType,
            encoding: {
              x: { field: data.xField, type: 'nominal', label: data.xField },
              y: data.yFields.map((y) => ({
                field: y.field,
                type: 'quantitative',
                agg: y.agg,
                label: y.label || y.field,
                color: y.color,
              })),
            },
            style: {
              showLegend: data.showLegend,
              showTooltip: data.showTooltip,
              showGrid: data.showGrid,
              stacked: data.stacked,
              smooth: data.smooth,
              aspectRatio: data.aspectRatio,
            },
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
    // Include isFormValid in dependencies to ensure ref updates when validity changes
    React.useImperativeHandle(
      ref,
      () => ({
        submitForm: async () => {
          return new Promise<void>((resolve, reject) => {
            handleSubmit(
              async (data) => {
                try {
                  await onSubmit(data);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
              (errors) => {
                // Handle validation errors
                // react-hook-form errors structure: { fieldName: { type: string, message: string } }
                const errorMessages: string[] = [];
                Object.keys(errors).forEach((fieldName) => {
                  const error = errors[fieldName as keyof typeof errors];
                  if (error) {
                    if (typeof error === 'object' && 'message' in error && error.message) {
                      errorMessages.push(error.message);
                    } else if (Array.isArray(error)) {
                      // Handle array fields like yFields
                      error.forEach((item, index) => {
                        if (item && typeof item === 'object' && 'message' in item && item.message) {
                          errorMessages.push(`${fieldName}[${index}]: ${item.message}`);
                        }
                      });
                    }
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
      [handleSubmit, onSubmit, isSubmitting, isFormValid],
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
        // Small delay to ensure form is initialized
        setTimeout(() => {
          generatePreview();
        }, 100);
      }
    }, [autoPreview, initialDatasetId, initialSpec]);

    // Add Y field
    const addYField = () => {
      const current = watch('yFields');
      const colors = [
        'var(--chart-1)',
        'var(--chart-2)',
        'var(--chart-3)',
        'var(--chart-4)',
        'var(--chart-5)',
      ];
      const nextColor = colors[current.length % colors.length];
      setValue('yFields', [...current, { field: '', agg: 'sum', label: '', color: nextColor }]);
    };

    // Remove Y field
    const removeYField = (index: number) => {
      const current = watch('yFields');
      if (current.length <= 1) return;
      setValue(
        'yFields',
        current.filter((_, i) => i !== index),
      );
    };

    // Generate preview
    const generatePreview = async () => {
      const formData = watch();

      // Validate
      if (!formData.datasetId || !formData.xField || formData.yFields.length === 0) {
        toast.error(t('Please complete the chart configuration'));
        return;
      }

      setIsPreviewLoading(true);

      try {
        // Get dataset data
        const result = await datasetsApi.preview(formData.datasetId);

        // Transform data based on spec
        const transformedData = transformData(result.rows, formData);
        const config = buildConfig(formData);

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

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel - 1/3 width */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('Chart Configuration')}</CardTitle>
              <CardDescription>
                {t('Configure chart data source and display options')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                          placeholder={t('eg: Sales Trend Analysis')}
                          maxLength={128}
                        />
                        <div className="flex justify-between items-center">
                          {errors.title && (
                            <p className="text-sm text-destructive">{errors.title.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground ml-auto">
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

                {/* Chart Type */}
                <div className="space-y-2">
                  <Label>{t('Chart Type')}</Label>
                  <Controller
                    name="chartType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select chart type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">{t('Line Chart')}</SelectItem>
                          <SelectItem value="bar">{t('Bar Chart')}</SelectItem>
                          <SelectItem value="area">{t('Area Chart')}</SelectItem>
                          <SelectItem value="pie">{t('Pie Chart')}</SelectItem>
                          <SelectItem value="table">{t('Table')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Dataset Schema - Show when dataset selected */}
                {selectedDataset && (
                  <div className="space-y-2 p-3 bg-muted rounded-md">
                    <Label className="text-xs text-muted-foreground">{t('Available Fields')}</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedDataset.schemaJson.map((field) => (
                        <Badge key={field.name} variant="secondary" className="text-xs">
                          {field.name} ({field.type})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* X Field */}
                <div className="space-y-2">
                  <Label>{t('X-Axis Field')}</Label>
                  <Controller
                    name="xField"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select X-Axis field')} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedDataset?.schemaJson.map((f) => (
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
                  <Label>{t('Y-Axis Field')}</Label>
                  <Controller
                    name="yFields"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        {field.value.map((yField, index) => (
                          <div key={index} className="flex gap-2 items-start p-2 border rounded-md">
                            <div className="flex-1 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={yField.field}
                                  onChange={(e) => {
                                    const updated = [...field.value];
                                    updated[index] = { ...updated[index], field: e.target.value };
                                    field.onChange(updated);
                                  }}
                                  className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                                >
                                  <option value="">{t('Select field')}</option>
                                  {selectedDataset?.schemaJson
                                    .filter((f) => f.type === 'quantitative')
                                    .map((f) => (
                                      <option key={f.name} value={f.name}>
                                        {f.name}
                                      </option>
                                    ))}
                                </select>

                                <select
                                  value={yField.agg}
                                  onChange={(e) => {
                                    const updated = [...field.value];
                                    updated[index] = {
                                      ...updated[index],
                                      agg: e.target.value as any,
                                    };
                                    field.onChange(updated);
                                  }}
                                  className="flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
                                >
                                  <option value="sum">{t('Sum')}</option>
                                  <option value="avg">{t('Average')}</option>
                                  <option value="min">{t('Min')}</option>
                                  <option value="max">{t('Max')}</option>
                                  <option value="count">{t('Count')}</option>
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder={t('Label (optional)')}
                                  value={yField.label || ''}
                                  onChange={(e) => {
                                    const updated = [...field.value];
                                    updated[index] = { ...updated[index], label: e.target.value };
                                    field.onChange(updated);
                                  }}
                                  className="text-xs"
                                />
                                <Input
                                  type="color"
                                  value={yField.color || 'var(--chart-1)'}
                                  onChange={(e) => {
                                    const updated = [...field.value];
                                    updated[index] = { ...updated[index], color: e.target.value };
                                    field.onChange(updated);
                                  }}
                                  className="h-8"
                                />
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const updated = field.value.filter((_, i) => i !== index);
                                field.onChange(updated);
                              }}
                              disabled={field.value.length <= 1}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <RiDeleteBinLine className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addYField}
                          className="w-full"
                        >
                          <RiAddLine className="h-4 w-4 mr-2" />
                          {t('Add Y-Axis Field')}
                        </Button>
                      </div>
                    )}
                  />
                  {errors.yFields && (
                    <p className="text-sm text-destructive">{errors.yFields.message}</p>
                  )}
                </div>

                {/* Style Options */}
                <div className="space-y-3 pt-2 border-t">
                  <Label>{t('Style Options')}</Label>
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

                    <Controller
                      name="stacked"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          {t('Stacked Mode')}
                        </label>
                      )}
                    />

                    <Controller
                      name="smooth"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          {t('Smooth Curve')}
                        </label>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('Aspect Ratio (0,5 - 3)')}</Label>
                    <Controller
                      name="aspectRatio"
                      control={control}
                      render={({ field }) => (
                        <Input
                          type="number"
                          min="0.5"
                          max="3"
                          step="0.1"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      )}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel - 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
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
                <RiPlayLine className="h-4 w-4 mr-2" />
                {isPreviewLoading ? t('Executing…') : t('Generate Preview')}
              </Button>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 && previewConfig && Object.keys(previewConfig).length > 0 ? (
                <ChartRenderer
                  chartType={chartType}
                  data={previewData}
                  config={previewConfig}
                  className="w-full"
                />
              ) : (
                <div className="flex items-center justify-center h-[350px] border-2 border-dashed rounded-lg text-muted-foreground">
                  <div className="text-center">
                    <RiMagicLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                    } catch (error) {
                      // Error handling is done in handleSubmit
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <RiMagicLine className="h-4 w-4 mr-2" />
                  {isSubmitting ? t('Saving…') : t('Save Chart')}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  },
);

// Helper: Transform data based on form data
function transformData(rows: Record<string, unknown>[], formData: FormData): unknown[] {
  const { xField, yFields } = formData;

  if (formData.chartType === 'table') {
    return rows;
  }

  if (formData.chartType === 'pie') {
    // For pie chart, aggregate by xField
    const grouped: Record<string, Record<string, number>> = {};

    rows.forEach((row) => {
      const xValue = String(row[xField]);
      if (!grouped[xValue]) {
        grouped[xValue] = {};
      }

      yFields.forEach((yField) => {
        const value = Number(row[yField.field]) || 0;
        if (!grouped[xValue][yField.field]) {
          grouped[xValue][yField.field] = 0;
        }

        // Apply aggregation
        switch (yField.agg) {
          case 'sum':
            grouped[xValue][yField.field] += value;
            break;
          case 'count':
            grouped[xValue][yField.field] += 1;
            break;
          case 'min':
            if (!grouped[xValue][yField.field] || value < grouped[xValue][yField.field]) {
              grouped[xValue][yField.field] = value;
            }
            break;
          case 'max':
            if (value > grouped[xValue][yField.field]) {
              grouped[xValue][yField.field] = value;
            }
            break;
          case 'avg':
            // For avg, we need to track sum and count
            if (!grouped[xValue][`${yField.field}_sum`]) {
              grouped[xValue][`${yField.field}_sum`] = 0;
              grouped[xValue][`${yField.field}_count`] = 0;
            }
            grouped[xValue][`${yField.field}_sum`] += value;
            grouped[xValue][`${yField.field}_count`] += 1;
            break;
        }
      });
    });

    // Convert to array and handle avg
    return Object.entries(grouped).map(([xValue, values]) => {
      const result: Record<string, unknown> = { [xField]: xValue };

      yFields.forEach((yField) => {
        if (yField.agg === 'avg') {
          const sum = values[`${yField.field}_sum`] || 0;
          const count = values[`${yField.field}_count`] || 1;
          result[yField.field] = sum / count;
        } else {
          result[yField.field] = values[yField.field];
        }
      });

      return result;
    });
  }

  // For line, bar, area - return raw data or aggregated
  return rows;
}

// Helper: Build chart config (shadcn/ui compatible)
function buildConfig(formData: FormData): ChartConfig {
  const config: ChartConfig = {};

  formData.yFields.forEach((yField) => {
    config[yField.field] = {
      label: yField.label || yField.field,
      color: yField.color || 'var(--chart-1)',
    };
  });

  return config;
}
