'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset, ResultSet } from '@/types/chart';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RiArrowLeftLine,
  RiAddLine,
  RiDeleteBinLine,
  RiPlayLine,
  RiEyeOffLine,
  RiSaveLine,
} from '@remixicon/react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ResultTable } from '@/components/query/result-table';
import { Input } from '@/components/ui/input';

export default function DatasetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currentSql, setCurrentSql] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [queryResult, setQueryResult] = useState<ResultSet | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDataset();
  }, [id]);

  const loadDataset = async () => {
    try {
      setLoading(true);
      const data = await datasetsApi.get(Number(id));
      setDataset(data);
      setName(data.name);
      setDescription(data.description || '');
      setCurrentSql(data.querySql);
    } catch (error) {
      toast.error('加载数据集失败');
      router.push('/datasets');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!dataset) return false;
    return (
      name !== dataset.name ||
      description !== (dataset.description || '') ||
      currentSql !== dataset.querySql
    );
  };

  const handleSave = async () => {
    if (!dataset) return;

    try {
      setSaving(true);
      await datasetsApi.update(dataset.id, {
        name,
        description,
        querySql: currentSql,
      });
      toast.success('数据集已更新');
      await loadDataset();
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndQuery = async () => {
    if (!dataset) return;

    try {
      setSaving(true);
      await datasetsApi.update(dataset.id, {
        name,
        description,
        querySql: currentSql,
      });
      toast.success('数据集已更新');
      await loadDataset();
      await handleExecuteQueryWithSql(currentSql);
    } catch (error) {
      toast.error('更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteQueryWithSql = async (sql: string) => {
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
      {/* Page Header */}
      <PageHeader
        title={name}
        action={
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!hasChanges() || saving}>
              <RiSaveLine className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveAndQuery}
              disabled={!hasChanges() || saving}
            >
              <RiSaveLine className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存并查询'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/datasets')}>
              <RiArrowLeftLine className="h-4 w-4 mr-2" />
              返回
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <RiDeleteBinLine className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        }
      />
      <div className="flex items-center gap-2 border-b pb-4">
        <span className="text-sm text-muted-foreground">名称:</span>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="数据集名称"
          className="h-8 text-sm flex-1 max-w-md"
        />
        <span className="text-sm text-muted-foreground ml-4">描述:</span>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="数据集描述（可选）"
          className="h-8 text-sm flex-1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：SQL 查询 - 占 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SQL 查询</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={currentSql}
                onChange={(e) => setCurrentSql(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
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
        </div>

        {/* 右侧：数据结构 + 元数据 - 占 1/3 */}
        <div className="space-y-6">
          {/* 数据结构 */}
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
