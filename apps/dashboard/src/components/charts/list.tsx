'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { chartsApi } from '@/lib/api/charts';
import type { Chart, Dataset } from '@/types/chart';
import {
  RiEyeLine,
  RiEditLine,
  RiDeleteBin2Line,
  RiAddLine,
  RiBarChartLine,
  RiLineChartLine,
  RiPieChartLine,
  RiTableLine,
} from '@remixicon/react';
import { toast } from 'sonner';

interface ChartListProps {
  charts: Chart[];
  datasets: Dataset[];
  onRefresh?: () => void;
}

// 兼容旧接口的图表列表组件，供仍然引用 `@/components/charts/list` 的代码使用。
export function ChartList({ charts, datasets, onRefresh }: ChartListProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [chartToDelete, setChartToDelete] = React.useState<Chart | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const getDatasetName = (datasetId: number) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    return dataset?.name || '未知数据集';
  };

  const getChartIcon = (chartType: Chart['chartType']) => {
    const props = { className: 'h-5 w-5' };
    switch (chartType) {
      case 'line':
        return <RiLineChartLine {...props} />;
      case 'bar':
        return <RiBarChartLine {...props} />;
      case 'area':
        return <RiLineChartLine {...props} />;
      case 'pie':
        return <RiPieChartLine {...props} />;
      case 'table':
        return <RiTableLine {...props} />;
      default:
        return <RiBarChartLine {...props} />;
    }
  };

  const getChartBadgeVariant = (chartType: Chart['chartType']) => {
    switch (chartType) {
      case 'line':
        return 'default';
      case 'bar':
        return 'secondary';
      case 'area':
        return 'outline';
      case 'pie':
        return 'destructive';
      case 'table':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleDeleteClick = (chart: Chart) => {
    setChartToDelete(chart);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!chartToDelete) return;

    try {
      setIsDeleting(true);
      await chartsApi.delete(chartToDelete.id);
      toast.success('图表已删除');
      setDeleteDialogOpen(false);
      setChartToDelete(null);
      onRefresh?.();
    } catch (error) {
      toast.error('删除失败');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleDateString('zh-CN');
  };

  if (charts.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <RiBarChartLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>暂无图表</CardTitle>
          <CardDescription>创建您的第一个图表来开始数据可视化之旅</CardDescription>
          <div>
            <Button asChild>
              <Link href="/charts/new">
                <RiAddLine className="h-4 w-4 mr-2" />
                创建图表
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">图表列表</h2>
          <p className="text-muted-foreground">共 {charts.length} 个图表</p>
        </div>
        <Button asChild>
          <Link href="/charts/new">
            <RiAddLine className="h-4 w-4 mr-2" />
            新建图表
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {charts.map((chart) => (
          <Card key={chart.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getChartIcon(chart.chartType)}
                  <CardTitle className="text-lg">{chart.title}</CardTitle>
                </div>
                <Badge variant={getChartBadgeVariant(chart.chartType)}>
                  {chart.chartType.toUpperCase()}
                </Badge>
              </div>
              {chart.description && (
                <CardDescription className="mt-1">{chart.description}</CardDescription>
              )}
            </CardHeader>

            <CardContent className="flex-1 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">数据集：</span>
                <span
                  className="font-medium truncate max-w-[150px]"
                  title={getDatasetName(chart.datasetId)}
                >
                  {getDatasetName(chart.datasetId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间：</span>
                <span>{formatDate(chart.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">图表ID：</span>
                <span className="font-mono">{chart.id}</span>
              </div>
            </CardContent>

            <CardFooter className="pt-3 gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/charts/${chart.id}`}>
                  <RiEyeLine className="h-4 w-4 mr-1" />
                  查看
                </Link>
              </Button>

              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/charts/${chart.id}/edit`}>
                  <RiEditLine className="h-4 w-4 mr-1" />
                  编辑
                </Link>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => handleDeleteClick(chart)}
              >
                <RiDeleteBin2Line className="h-4 w-4 mr-1" />
                删除
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除图表"
        description={
          chartToDelete
            ? `确定要删除图表 "${chartToDelete.title}" 吗？此操作不可撤销。`
            : '确定要删除此图表吗？'
        }
        confirmText="删除"
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        variant="destructive"
      />
    </div>
  );
}
