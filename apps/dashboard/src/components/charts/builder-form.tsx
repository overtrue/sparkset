'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import * as React from 'react';
import type { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import type { ChartBuilderFormData, Dataset } from './builder';
import { ChartSelector, ChartVariantSelector } from './chart-selector';
import type { ChartCategory, ChartVariant } from './types';

type DatasetField = Dataset['schemaJson'][number];

const CHARTS_WITH_GRID: ChartCategory[] = ['area', 'bar', 'line'];
const CHARTS_WITH_STACKED: ChartCategory[] = ['area', 'bar'];
const CHARTS_WITH_DOTS: ChartCategory[] = ['area', 'line'];
const CHARTS_WITH_CURVE: ChartCategory[] = ['area', 'line'];
const CHARTS_WITH_RADII: ChartCategory[] = ['pie', 'radial'];

type YFieldValue = ChartBuilderFormData['yFields'][number];

const updateYFieldAt = (
  fields: ChartBuilderFormData['yFields'],
  index: number,
  update: Partial<YFieldValue>,
) => fields.map((item, itemIndex) => (itemIndex === index ? { ...item, ...update } : item));

const removeYFieldAt = (fields: ChartBuilderFormData['yFields'], index: number) =>
  fields.filter((_, itemIndex) => itemIndex !== index);

interface ChartConfigFormProps {
  formRef: React.RefObject<HTMLFormElement | null>;
  control: Control<ChartBuilderFormData>;
  errors: FieldErrors<ChartBuilderFormData>;
  datasets: Dataset[];
  selectedDataset: Dataset | null;
  chartType: ChartCategory;
  variant?: ChartVariant;
  setValue: UseFormSetValue<ChartBuilderFormData>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  requiresCategory: boolean;
  supportsMultipleY: boolean;
  numericFields: DatasetField[];
  allFields: DatasetField[];
  addYField: () => void;
}

export function ChartConfigForm({
  formRef,
  control,
  errors,
  datasets,
  selectedDataset,
  chartType,
  variant,
  setValue,
  onSubmit,
  requiresCategory,
  supportsMultipleY,
  numericFields,
  allFields,
  addYField,
}: ChartConfigFormProps) {
  const t = useTranslations();
  const aggregationOptions = React.useMemo(
    () => [
      { value: 'sum', label: t('Sum') },
      { value: 'avg', label: t('Average') },
      { value: 'min', label: t('Min') },
      { value: 'max', label: t('Max') },
      { value: 'count', label: t('Count') },
    ],
    [t],
  );
  const xFieldLabel = requiresCategory ? t('Category Field') : t('X-Axis Field');
  const xFieldPlaceholder = requiresCategory
    ? t('Select category field…')
    : t('Select X-Axis field…');
  const yFieldLabel = requiresCategory ? t('Value Field') : t('Y-Axis Field');
  const supportsGrid = CHARTS_WITH_GRID.includes(chartType);
  const supportsStacked = CHARTS_WITH_STACKED.includes(chartType);
  const supportsDots = CHARTS_WITH_DOTS.includes(chartType);
  const supportsCurve = CHARTS_WITH_CURVE.includes(chartType);
  const supportsRadii = CHARTS_WITH_RADII.includes(chartType);
  const datasetSelectId = 'chart-dataset';
  const chartTitleId = 'chart-title';
  const chartDescriptionId = 'chart-description';
  const chartTypeTriggerId = 'chart-type';
  const chartStyleLabelId = 'chart-style';
  const xFieldSelectId = 'chart-x-field';
  const curveTypeSelectId = 'chart-curve-type';
  const innerRadiusId = 'chart-inner-radius';
  const outerRadiusId = 'chart-outer-radius';

  return (
    <div className="space-y-6 lg:col-span-1">
      <Card>
        <CardHeader>
          <CardTitle>{t('Chart Configuration')}</CardTitle>
          <CardDescription>{t('Configure chart data source and display options')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
            {/* Dataset Selection */}
            <div className="space-y-2">
              <Label htmlFor={datasetSelectId}>{t('Dataset')}</Label>
              <Controller
                name="datasetId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value.toString()}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger id={datasetSelectId}>
                      <SelectValue placeholder={t('Select dataset…')} />
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
              <Label htmlFor={chartTitleId}>{t('Chart Title')}</Label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1">
                    <Input
                      {...field}
                      id={chartTitleId}
                      name={field.name}
                      placeholder={t('eg: Sales Trend Analysis…')}
                      maxLength={128}
                      autoComplete="off"
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
              <Label htmlFor={chartDescriptionId}>{t('Description (optional)')}</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id={chartDescriptionId}
                    name={field.name}
                    placeholder={t('Describe what this chart shows…')}
                    rows={2}
                    autoComplete="off"
                  />
                )}
              />
            </div>

            <Separator />

            {/* Chart Type Selection */}
            <div className="space-y-2">
              <Label htmlFor={chartTypeTriggerId}>{t('Chart Type')}</Label>
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
                    triggerId={chartTypeTriggerId}
                  />
                )}
              />
            </div>

            {/* Chart Variant Selection */}
            <div className="space-y-2">
              <Label id={chartStyleLabelId}>{t('Chart Style')}</Label>
              <Controller
                name="variant"
                control={control}
                render={({ field }) => (
                  <ChartVariantSelector
                    category={chartType}
                    value={field.value as ChartVariant}
                    onChange={(value) => field.onChange(value)}
                    ariaLabelledBy={chartStyleLabelId}
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
              <Label htmlFor={xFieldSelectId}>{xFieldLabel}</Label>
              <Controller
                name="xField"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id={xFieldSelectId}>
                      <SelectValue placeholder={xFieldPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {allFields.map((item) => (
                        <SelectItem key={item.name} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.xField && <p className="text-sm text-destructive">{errors.xField.message}</p>}
            </div>

            {/* Y Fields */}
            <div className="space-y-2">
              <Label>{yFieldLabel}</Label>
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
                              field.onChange(updateYFieldAt(field.value, index, { field: val }));
                            }}
                          >
                            <SelectTrigger className="h-9 flex-1" aria-label={yFieldLabel}>
                              <SelectValue placeholder={t('Select field…')} />
                            </SelectTrigger>
                            <SelectContent>
                              {numericFields.map((item) => (
                                <SelectItem key={item.name} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Aggregation selector */}
                          <Select
                            value={yField.agg}
                            onValueChange={(val) => {
                              field.onChange(
                                updateYFieldAt(field.value, index, {
                                  agg: val as YFieldValue['agg'],
                                }),
                              );
                            }}
                          >
                            <SelectTrigger className="h-9 w-24" aria-label={t('Aggregation')}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aggregationOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Delete button */}
                          {supportsMultipleY && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                field.onChange(removeYFieldAt(field.value, index));
                              }}
                              disabled={field.value.length <= 1}
                              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={t('Remove field')}
                              title={t('Remove field')}
                            >
                              <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>

                        {/* Label input - only show for multiple Y fields */}
                        {supportsMultipleY && field.value.length > 1 && (
                          <div className="mt-2">
                            <Input
                              placeholder={t('eg: Revenue…')}
                              value={yField.label || ''}
                              name={`yFields.${index}.label`}
                              autoComplete="off"
                              aria-label={t('Series Label')}
                              onChange={(event) => {
                                field.onChange(
                                  updateYFieldAt(field.value, index, {
                                    label: event.target.value,
                                  }),
                                );
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
                        <RiAddLine className="h-4 w-4" aria-hidden="true" />
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

                {supportsGrid && (
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

                {supportsStacked && (
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

                {supportsDots && (
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
              {supportsCurve && (
                <div className="space-y-2">
                  <Label className="text-xs" htmlFor={curveTypeSelectId}>
                    {t('Curve Type')}
                  </Label>
                  <Controller
                    name="curveType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id={curveTypeSelectId} className="h-8">
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
              {supportsRadii && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={innerRadiusId}>
                      {t('Inner Radius')}
                    </Label>
                    <Controller
                      name="innerRadius"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id={innerRadiusId}
                          type="number"
                          min="0"
                          max="100"
                          value={field.value}
                          inputMode="numeric"
                          name={field.name}
                          autoComplete="off"
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          className="h-8"
                        />
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={outerRadiusId}>
                      {t('Outer Radius')}
                    </Label>
                    <Controller
                      name="outerRadius"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id={outerRadiusId}
                          type="number"
                          min="0"
                          max="100"
                          value={field.value}
                          inputMode="numeric"
                          name={field.name}
                          autoComplete="off"
                          onChange={(event) => field.onChange(Number(event.target.value))}
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
  );
}
