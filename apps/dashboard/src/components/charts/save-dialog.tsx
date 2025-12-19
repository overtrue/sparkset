'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { datasetsApi } from '@/lib/api/datasets';
import { chartsApi } from '@/lib/api/charts';
import { toast } from 'sonner';
import { RiLoader4Line, RiArrowRightLine } from '@remixicon/react';
import Link from 'next/link';

interface SaveChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  datasourceId?: number;
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
      toast.error('请输入数据集名称');
      return;
    }
    if (!datasourceId) {
      toast.error('缺少数据源信息');
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
      toast.success('数据集创建成功');
    } catch (error) {
      toast.error('创建数据集失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChart = async () => {
    if (!chartTitle.trim()) {
      toast.error('请输入图表标题');
      return;
    }
    if (!createdDatasetId) {
      toast.error('缺少数据集信息');
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

      toast.success('图表创建成功');
      onOpenChange(false);
      router.push('/charts');
    } catch (error) {
      toast.error('创建图表失败');
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
          <DialogTitle>保存为图表</DialogTitle>
          <DialogDescription>将查询结果保存为可复用的图表</DialogDescription>
        </DialogHeader>

        {step === 'create-dataset' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>数据集名称</Label>
              <Input
                placeholder="例如：过去30天销售数据"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                placeholder="描述这个数据集的用途"
                value={datasetDescription}
                onChange={(e) => setDatasetDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>SQL 查询</Label>
              <Textarea value={sql} rows={4} readOnly className="font-mono text-xs" />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                取消
              </Button>
              <Button onClick={handleCreateDataset} disabled={loading}>
                {loading && <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />}
                创建数据集
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">步骤 1:</span>
              <span>数据集 "{datasetName}" 已创建</span>
              <RiArrowRightLine className="h-4 w-4" />
              <span className="font-medium text-foreground">步骤 2:</span>
              <span>创建图表</span>
            </div>

            <div className="space-y-2">
              <Label>图表标题</Label>
              <Input
                placeholder="例如：地区销售趋势"
                value={chartTitle}
                onChange={(e) => setChartTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>描述（可选）</Label>
              <Textarea
                placeholder="描述这个图表展示的内容"
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
                返回上一步
              </Button>
              <Button onClick={handleCreateChart} disabled={loading}>
                {loading && <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />}
                创建图表
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
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
            color: '#3b82f6',
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
