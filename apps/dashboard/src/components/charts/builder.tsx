'use client';

import * as React from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChartRenderer } from './renderer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset, ChartSpec } from '@/types/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { RiAddLine, RiDeleteBinLine, RiMagicLine, RiPlayLine } from '@remixicon/react';
import { toast } from 'sonner';

// Form validation schema
const formSchema = z.object({
  datasetId: z.number().min(1, '请选择数据集'),
  title: z.string().min(1, '请输入图表标题'),
  description: z.string().optional(),
  chartType: z.enum(['line', 'bar', 'area', 'pie', 'table']),
  xField: z.string().min(1, '请选择X轴字段'),
  yFields: z
    .array(
      z.object({
        field: z.string().min(1, '字段名不能为空'),
        agg: z.enum(['sum', 'avg', 'min', 'max', 'count']),
        label: z.string().optional(),
        color: z.string().optional(),
      }),
    )
    .min(1, '至少需要一个Y轴字段'),
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
  submitForm: () => void;
  isSubmitting: boolean;
}

interface ChartBuilderProps {
  datasets: Dataset[];
  onSave: (data: ChartSaveData) => void;
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
      formState: { errors, isSubmitting },
    } = useForm<FormData>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        datasetId: initialDatasetId || 0,
        title: initialTitle || initialSpec?.encoding?.x?.label || '',
        description: initialDescription || '',
        chartType: initialSpec?.chartType || 'line',
        xField: initialSpec?.encoding?.x?.field || '',
        yFields: initialSpec?.encoding?.y || [
          { field: '', agg: 'sum', label: '', color: '#3b82f6' },
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

    // Expose form submission to parent
    React.useImperativeHandle(ref, () => ({
      submitForm: () => {
        formRef.current?.requestSubmit();
      },
      isSubmitting,
    }));

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
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
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
        toast.error('请填写完整的图表配置');
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
        toast.success('预览已更新');
      } catch (error) {
        toast.error('生成预览失败');
        console.error(error);
      } finally {
        setIsPreviewLoading(false);
      }
    };

    // Submit handler
    const onSubmit: SubmitHandler<FormData> = async (data) => {
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

        onSave({
          datasetId: data.datasetId,
          title: data.title,
          description: data.description,
          chartType: data.chartType,
          spec,
        });
      } catch (error) {
        toast.error('保存失败');
        console.error(error);
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel - 1/3 width */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>图表配置</CardTitle>
              <CardDescription>设置图表的数据源和显示选项</CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Dataset Selection */}
                <div className="space-y-2">
                  <Label>数据集</Label>
                  <Controller
                    name="datasetId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value.toString()}
                        onValueChange={(val) => field.onChange(Number(val))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择数据集" />
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
                  <Label>图表标题</Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => <Input {...field} placeholder="例如：销售趋势分析" />}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>描述（可选）</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea {...field} placeholder="描述图表内容" rows={2} />
                    )}
                  />
                </div>

                {/* Chart Type */}
                <div className="space-y-2">
                  <Label>图表类型</Label>
                  <Controller
                    name="chartType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择图表类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">折线图</SelectItem>
                          <SelectItem value="bar">柱状图</SelectItem>
                          <SelectItem value="area">面积图</SelectItem>
                          <SelectItem value="pie">饼图</SelectItem>
                          <SelectItem value="table">表格</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Dataset Schema - Show when dataset selected */}
                {selectedDataset && (
                  <div className="space-y-2 p-3 bg-muted rounded-md">
                    <Label className="text-xs text-muted-foreground">可用字段</Label>
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
                  <Label>X轴字段</Label>
                  <Controller
                    name="xField"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择X轴字段" />
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
                  <Label>Y轴字段</Label>
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
                                  <option value="">选择字段</option>
                                  {selectedDataset?.schemaJson
                                    .filter((f) => f.type === 'number')
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
                                  <option value="sum">求和</option>
                                  <option value="avg">平均</option>
                                  <option value="min">最小</option>
                                  <option value="max">最大</option>
                                  <option value="count">计数</option>
                                </select>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="标签（可选）"
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
                                  value={yField.color || '#3b82f6'}
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
                          添加Y轴字段
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
                  <Label>样式选项</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Controller
                      name="showLegend"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          显示图例
                        </label>
                      )}
                    />

                    <Controller
                      name="showTooltip"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          显示提示
                        </label>
                      )}
                    />

                    <Controller
                      name="showGrid"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          显示网格
                        </label>
                      )}
                    />

                    <Controller
                      name="stacked"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          堆叠模式
                        </label>
                      )}
                    />

                    <Controller
                      name="smooth"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          平滑曲线
                        </label>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>宽高比 (0.5 - 3)</Label>
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
                <CardTitle>实时预览</CardTitle>
                <CardDescription>查看图表效果</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePreview}
                disabled={isPreviewLoading}
              >
                <RiPlayLine className="h-4 w-4 mr-2" />
                {isPreviewLoading ? '执行中...' : '执行预览'}
              </Button>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 && previewConfig && Object.keys(previewConfig).length > 0 ? (
                <ChartRenderer
                  chartType={chartType}
                  data={previewData}
                  config={previewConfig}
                  className="aspect-video"
                />
              ) : (
                <div className="flex items-center justify-center aspect-video border-2 border-dashed rounded-lg text-muted-foreground">
                  <div className="text-center">
                    <RiMagicLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>配置图表并生成预览</p>
                  </div>
                </div>
              )}
            </CardContent>
            {showActions && (
              <div className="flex gap-2 p-4 pt-0">
                <Button
                  type="button"
                  onClick={() => formRef.current?.requestSubmit()}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <RiMagicLine className="h-4 w-4 mr-2" />
                  {isSubmitting ? '保存中...' : '保存图表'}
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
      color: yField.color || '#3b82f6',
    };
  });

  return config;
}
