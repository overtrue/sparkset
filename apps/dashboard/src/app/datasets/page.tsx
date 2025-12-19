'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset } from '@/types/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RiAddLine,
  RiDatabaseLine,
  RiMore2Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
} from '@remixicon/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';

export default function DatasetsPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<Dataset | null>(null);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const result = await datasetsApi.list();
      setDatasets(result.items);
    } catch (error) {
      toast.error('加载数据集失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dataset: Dataset) => {
    setDatasetToDelete(dataset);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!datasetToDelete) return;

    try {
      await datasetsApi.delete(datasetToDelete.id);
      toast.success('数据集已删除');
      loadDatasets();
    } catch (error) {
      toast.error('删除数据集失败');
    } finally {
      setDeleteConfirmOpen(false);
      setDatasetToDelete(null);
    }
  };

  const handleCreateNew = () => {
    router.push('/query');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="数据集"
          description="管理您的查询结果数据集"
          action={
            <Button onClick={handleCreateNew} disabled>
              <RiAddLine className="h-4 w-4 mr-2" />
              新建数据集
            </Button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="数据集"
          description="管理您的查询结果数据集"
          action={
            <Button onClick={handleCreateNew}>
              <RiAddLine className="h-4 w-4 mr-2" />
              新建数据集
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiDatabaseLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无数据集</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            从查询页面执行 SQL 查询后，可以将结果保存为数据集以便后续创建图表
          </p>
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4 mr-2" />
            去创建第一个数据集
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="数据集"
        description="管理您的查询结果数据集"
        action={
          <Button onClick={handleCreateNew}>
            <RiAddLine className="h-4 w-4 mr-2" />
            新建数据集
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((dataset) => (
          <Card key={dataset.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg truncate flex-1">{dataset.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <RiMore2Line className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/datasets/${dataset.id}`)}>
                      <RiExternalLinkLine className="h-4 w-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/datasets/${dataset.id}/edit`)}>
                      <RiPencilLine className="h-4 w-4 mr-2" />
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(dataset)}
                      className="text-red-600"
                    >
                      <RiDeleteBinLine className="h-4 w-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription>{dataset.description || '无描述'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">查询行数:</span>
                  <span className="font-medium">N/A</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">创建时间:</span>
                  <span className="font-medium">
                    {new Date(dataset.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => router.push(`/charts/new?datasetId=${dataset.id}`)}
              >
                <RiAddLine className="h-4 w-4 mr-2" />
                创建图表
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push(`/datasets/${dataset.id}`)}
              >
                查看
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除数据集"
        description={`确定要删除 "${datasetToDelete?.name}" 吗？此操作无法撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
      />
    </div>
  );
}
