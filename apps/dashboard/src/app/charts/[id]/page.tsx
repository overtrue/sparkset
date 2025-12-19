'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RiArrowLeftLine, RiEditLine, RiDeleteBin2Line, RiRefreshLine } from '@remixicon/react';
import Link from 'next/link';
import { chartsApi } from '@/lib/api/charts';
import { ChartRenderer } from '@/components/charts/renderer';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from 'sonner';

interface Props {
  params: {
    id: string;
  };
}

export default function ChartDetailPage({ params }: Props) {
  const router = useRouter();
  const id = Number(params.id);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [renderData, setRenderData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    Promise.all([chartsApi.get(id), chartsApi.render(id)])
      .then(([chart, render]) => {
        setChartData(chart);
        setRenderData(render);
      })
      .catch((err) => {
        setError('图表不存在或无法访问');
      });
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

  if (!chartData || !renderData) {
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
        description={chartData.description || '图表详情'}
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
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <RiDeleteBin2Line className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 图表展示 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>图表预览</CardTitle>
              <CardDescription>
                {chartData.chartType.toUpperCase()} | 数据集：{chartData.dataset?.name || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartRenderer
                chartType={renderData.chartType}
                data={renderData.data}
                config={renderData.config}
                rechartsProps={renderData.rechartsProps}
                className="aspect-video"
              />
              {renderData.warnings && renderData.warnings.length > 0 && (
                <div className="mt-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                  <strong>警告：</strong>
                  {renderData.warnings.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 配置信息 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>配置信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">图表类型：</span>
                <span>{chartData.chartType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">数据集ID：</span>
                <span>{chartData.datasetId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间：</span>
                <span>{new Date(chartData.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" asChild>
                <Link href={`/charts/${id}/edit`}>
                  <RiEditLine className="h-4 w-4 mr-2" />
                  编辑配置
                </Link>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/charts/new" className="flex items-center">
                  <RiRefreshLine className="h-4 w-4 mr-2" />
                  基于此创建
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="删除图表"
        description={`确定要删除图表 "${chartData.title}" 吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </div>
  );
}
