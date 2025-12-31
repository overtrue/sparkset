'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import { RiArrowRightLine, RiLoader4Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface SaveChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  datasourceId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
  defaultName?: string;
}

export function SaveChartDialog({
  open,
  onOpenChange,
  sql,
  datasourceId,
  rows,
  defaultName,
}: SaveChartDialogProps) {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState<'create-dataset' | 'create-chart'>('create-dataset');
  const [loading, setLoading] = useState(false);
  const [createdDatasetId, setCreatedDatasetId] = useState<number | null>(null);

  // Dataset form state
  const [datasetName, setDatasetName] = useState(defaultName || '');
  const [datasetDescription, setDatasetDescription] = useState('');

  // Chart form state
  const [chartTitle, setChartTitle] = useState(defaultName || '');
  const [chartDescription, setChartDescription] = useState('');

  const handleCreateDataset = async () => {
    if (!datasetName.trim()) {
      toast.error(t('Please enter dataset name'));
      return;
    }
    if (!datasourceId) {
      toast.error(t('Missing datasource information'));
      return;
    }

    try {
      setLoading(true);

      // Infer schema from rows
      const schema = inferSchema(rows);

      const dataset = await datasetsApi.create({
        datasourceId,
        name: datasetName,
        description: datasetDescription,
        querySql: sql,
        schemaJson: schema,
      });

      setCreatedDatasetId(dataset.id);
      setStep('create-chart');
      toast.success(t('Dataset created successfully'));
    } catch {
      toast.error(t('Failed to create dataset'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChart = async () => {
    if (!chartTitle.trim()) {
      toast.error(t('Please enter chart title'));
      return;
    }
    if (!createdDatasetId) {
      toast.error(t('Missing dataset information'));
      return;
    }

    try {
      setLoading(true);

      // Auto-generate chart spec based on schema
      const spec = autoGenerateSpec(rows);

      await chartsApi.create({
        datasetId: createdDatasetId,
        title: chartTitle,
        description: chartDescription,
        chartType: spec.chartType,
        spec: spec,
      });

      toast.success(t('Chart created successfully'));
      onOpenChange(false);
      router.push('/dashboard/charts');
    } catch {
      toast.error(t('Failed to create chart'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('create-dataset');
    setLoading(false);
    setCreatedDatasetId(null);
    setDatasetName(defaultName || '');
    setDatasetDescription('');
    setChartTitle(defaultName || '');
    setChartDescription('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) handleReset();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('Save as Chart')}</DialogTitle>
          <DialogDescription>{t('Save query result as a reusable chart')}</DialogDescription>
        </DialogHeader>

        {step === 'create-dataset' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Dataset Name')}</Label>
              <Input
                placeholder={t('e.g.: Last 30 days sales data')}
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Description (optional)')}</Label>
              <Textarea
                placeholder={t('Describe the purpose of this dataset')}
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('SQL Query')}</Label>
              <Textarea value={sql} rows={4} readOnly className="font-mono text-xs" />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {t('Cancel')}
              </Button>
              <Button onClick={handleCreateDataset} disabled={loading}>
                {loading && <RiLoader4Line className="h-4 w-4 animate-spin" />}
                {t('Create Dataset')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('Step 1:')}</span>
              <span>{t('Dataset "{name}" created', { name: datasetName })}</span>
              <RiArrowRightLine className="h-4 w-4" />
              <span className="font-medium text-foreground">{t('Step 2:')}</span>
              <span>{t('Create Chart')}</span>
            </div>

            <div className="space-y-2">
              <Label>{t('Chart Title')}</Label>
              <Input
                placeholder={t('e.g.: Regional Sales Trend')}
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Description (optional)')}</Label>
              <Textarea
                placeholder={t('Describe what this chart shows')}
                value={chartDescription}
                onChange={(e) => setChartDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setStep('create-dataset')}
                disabled={loading}
              >
                {t('Back')}
              </Button>
              <Button onClick={handleCreateChart} disabled={loading}>
                {loading && <RiLoader4Line className="h-4 w-4 animate-spin" />}
                {t('Create Chart')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inferSchema(rows: any[]) {
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0];
  const schema = Object.keys(firstRow).map((key) => {
    const value = firstRow[key];
    // Convert to backend expected types: quantitative, temporal, nominal, ordinal
    const rawType = typeof value === 'number' ? 'quantitative' : 'nominal';
    return { name: key, type: rawType };
  });

  return schema;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function autoGenerateSpec(rows: any[]) {
  const schema = inferSchema(rows);
  const nominalFields = schema.filter((f) => f.type === 'nominal');
  const quantitativeFields = schema.filter((f) => f.type === 'quantitative');

  // Default to line chart if we have at least one nominal (for x-axis) and one quantitative (for y-axis)
  if (nominalFields.length > 0 && quantitativeFields.length > 0) {
    return {
      specVersion: '1.0' as const,
      chartType: 'line' as const,
      encoding: {
        x: { field: nominalFields[0].name, type: 'nominal' as const, label: nominalFields[0].name },
        y: [
          {
            field: quantitativeFields[0].name,
            type: 'quantitative' as const,
            agg: 'sum' as const,
            label: quantitativeFields[0].name,
            color: 'var(--chart-1)',
          },
        ],
      },
      transform: [],
      style: { showLegend: true, smooth: false, stacked: false, aspectRatio: 1.5 },
    };
  }

  // Fallback to table
  return {
    specVersion: '1.0' as const,
    chartType: 'table' as const,
    encoding: {},
    transform: [],
    style: {},
  };
}
