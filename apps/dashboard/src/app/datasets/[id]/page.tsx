'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset, ResultSet } from '@/types/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RiArrowLeftLine,
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiPlayLine,
  RiEyeOffLine,
} from '@remixicon/react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ResultTable } from '@/components/query/result-table';

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [queryResult, setQueryResult] = useState<ResultSet | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  useEffect(() => {
    loadDataset();
  }, [id]);

  const loadDataset = async () => {
    try {
      setLoading(true);
      const data = await datasetsApi.get(Number(id));
      setDataset(data);
      setEditData({ name: data.name, description: data.description || '' });
    } catch (error) {
      toast.error('加载数据集失败');
      router.push('/datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!dataset) return;

    try {
      await datasetsApi.update(dataset.id, editData);
      toast.success('数据集已更新');
      setEditing(false);
      loadDataset();
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const handleDelete = async () => {
    if (!dataset) return;

    try {
      await datasetsApi.delete(dataset.id);
      toast.success('数据集已删除');
      router.push('/datasets');
    } catch (error) {
      toast.error('删除失败');
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!dataset) return;

    try {
      setQueryLoading(true);
      setQueryResult(null);
      const result = await datasetsApi.preview(dataset.id);
      setQueryResult(result);
      toast.success('查询执行成功');
    } catch (error) {
      toast.error('查询执行失败');
      console.error(error);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleToggleQueryResult = () => {
    if (queryResult) {
      setQueryResult(null);
    } else {
      handleExecuteQuery();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dataset) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={editing ? '编辑数据集' : dataset.name}
        description={editing ? '修改数据集信息' : '数据集详情'}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/datasets')}>
              <RiArrowLeftLine className="h-4 w-4 mr-2" />
              返回列表
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="space-y-2">
                  <Label>名称</Label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleUpdate} size="sm">
                    保存
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                    取消
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">名称</div>
                  <div className="font-medium">{dataset.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">描述</div>
                  <div className="font-medium">
                    {dataset.description || <span className="text-muted-foreground">无</span>}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">ID</div>
                  <div className="font-mono text-sm">{dataset.id}</div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <RiEditLine className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <RiDeleteBinLine className="h-4 w-4 mr-2" />
                    删除
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* SQL 查询 */}
        <Card>
          <CardHeader>
            <CardTitle>SQL 查询</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={dataset.querySql} readOnly rows={8} className="font-mono text-xs" />
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={handleToggleQueryResult} disabled={queryLoading}>
                {queryLoading ? (
                  <RiPlayLine className="h-4 w-4 mr-2 animate-spin" />
                ) : queryResult ? (
                  <RiEyeOffLine className="h-4 w-4 mr-2" />
                ) : (
                  <RiPlayLine className="h-4 w-4 mr-2" />
                )}
                {queryLoading ? '执行中...' : queryResult ? '隐藏结果' : '执行查询'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/charts/new?datasetId=${dataset.id}`)}
              >
                <RiAddLine className="h-4 w-4 mr-2" />
                创建图表
              </Button>
            </div>
            {queryResult && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-muted-foreground">
                  共 {queryResult.rowCount} 行数据
                </div>
                <ResultTable rows={queryResult.rows} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schema */}
        <Card>
          <CardHeader>
            <CardTitle>数据结构</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataset.schemaJson?.map((field: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                >
                  <span className="font-medium">{field.name}</span>
                  <Badge variant="secondary">{field.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 元数据 */}
        <Card>
          <CardHeader>
            <CardTitle>元数据</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">数据源ID:</span>
              <span className="font-medium">{dataset.datasourceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Schema Hash:</span>
              <span className="font-mono text-xs">{dataset.schemaHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">创建时间:</span>
              <span className="font-medium">{new Date(dataset.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">更新时间:</span>
              <span className="font-medium">{new Date(dataset.updatedAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除数据集"
        description={`确定要删除 "${dataset.name}" 吗？关联的图表也会受到影响。`}
        onConfirm={handleDelete}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
      />
    </div>
  );
}
