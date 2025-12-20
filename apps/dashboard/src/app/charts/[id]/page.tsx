'use client';

import { ChartRenderer } from '@/components/charts/renderer';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset, ChartSpec } from '@/types/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { RiArrowLeftLine, RiDeleteBin2Line, RiEditLine, RiRefreshLine } from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
  params: Promise<{
    id: string;
  }>;
}

// Helper: Transform data based on spec (same as ChartBuilder)
function transformData(
  rows: Record<string, unknown>[],
  spec: ChartSpec,
  chartType: string,
): unknown[] {
  if (chartType === 'table') {
    return rows;
  }

  if (chartType === 'pie' && spec.encoding?.x && spec.encoding?.y) {
    const xField = spec.encoding.x.field;
    const yFields = spec.encoding.y;

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

    return Object.entries(grouped).map(([xValue, values]) => {
      const result: Record<string, unknown> = { [xField]: xValue };

      if (spec.encoding?.y) {
        spec.encoding.y.forEach((yField) => {
          if (yField.agg === 'avg') {
            const sum = values[`${yField.field}_sum`] || 0;
            const count = values[`${yField.field}_count`] || 1;
            result[yField.field] = sum / count;
          } else {
            result[yField.field] = values[yField.field];
          }
        });
      }

      return result;
    });
  }

  return rows;
}

// Helper: Build chart config (same as ChartBuilder)
function buildConfig(spec: ChartSpec): ChartConfig {
  const config: ChartConfig = {};

  if (spec.encoding?.y) {
    spec.encoding.y.forEach((yField) => {
      config[yField.field] = {
        label: yField.label || yField.field,
        color: yField.color || '#3b82f6',
      };
    });
  }

  return config;
}

export default function ChartDetailPage({ params }: Props) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const id = Number(unwrappedParams.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [previewData, setPreviewData] = useState<unknown[]>([]);
  const [previewConfig, setPreviewConfig] = useState<ChartConfig>({});
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [chartResult, datasetsResult] = await Promise.all([
          chartsApi.get(id),
          datasetsApi.list(),
        ]);
        setChartData(chartResult);
        setDatasets(datasetsResult.items);

        // Generate preview using same logic as ChartBuilder
        if (chartResult.specJson && chartResult.datasetId) {
          const previewResult = await datasetsApi.preview(chartResult.datasetId);
          const transformedData = transformData(
            previewResult.rows,
            chartResult.specJson,
            chartResult.chartType,
          );
          const config = buildConfig(chartResult.specJson);

          setPreviewData(transformedData);
          setPreviewConfig(config);
        }
      } catch (err) {
        setError('图表不存在或无法访问');
      }
    };

    loadData();
  }, [id]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await chartsApi.delete(id);
      toast.success('图表已删除');
      router.push('/charts');
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="图表不存在" description="" />
        <Card>
          <CardHeader>
            <CardTitle>未找到图表</CardTitle>
            <CardDescription>图表可能已被删除或您没有访问权限</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/charts">
                <RiArrowLeftLine className="h-4 w-4 mr-2" />
                返回列表
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!chartData || previewData.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="加载中..." description="" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={chartData.title}
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/charts">
                <RiArrowLeftLine className="h-4 w-4 mr-2" />
                返回
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/charts/${id}/edit`}>
                <RiEditLine className="h-4 w-4 mr-2" />
                编辑
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/charts/new" className="flex items-center">
                <RiRefreshLine className="h-4 w-4 mr-2" />
                基于此创建
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <RiDeleteBin2Line className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        }
      />

      {/* 配置信息 - 一行显示 */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <span>
          图表类型：<span className="text-foreground font-medium">{chartData.chartType}</span>
        </span>
        <span>
          数据集：
          <span className="text-foreground font-medium">
            {chartData.dataset?.name || chartData.datasetId}
          </span>
        </span>
        <span>
          创建时间：
          <span className="text-foreground font-medium">
            {new Date(chartData.createdAt).toLocaleDateString()}
          </span>
        </span>
      </div>

      {/* 图表展示 - 使用 ChartRenderer，数据处理逻辑与编辑页一致 */}
      <Card>
        <CardHeader>
          <CardTitle>图表预览</CardTitle>
          <CardDescription>
            {chartData.chartType.toUpperCase()} | 数据集：{chartData.dataset?.name || 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartRenderer
            chartType={chartData.chartType}
            data={previewData}
            config={previewConfig}
            className="aspect-video"
          />
        </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="删除图表"
        description={`确定要删除图表 \"${chartData.title}\" 吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}
