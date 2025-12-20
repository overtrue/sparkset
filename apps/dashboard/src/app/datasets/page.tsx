'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset } from '@/types/chart';
import { Button } from '@/components/ui/button';
import { RiAddLine, RiDatabaseLine } from '@remixicon/react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';

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

  const handleDeleteSelected = async (rows: Dataset[]) => {
    for (const row of rows) {
      try {
        await datasetsApi.delete(row.id);
      } catch (err) {
        toast.error(`删除 ${row.name} 失败: ${(err as Error)?.message}`);
      }
    }
    setDatasets((prev) => prev.filter((d) => !rows.some((r) => r.id === d.id)));
    toast.success(`成功删除 ${rows.length} 个数据集`);
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const columns: ColumnDef<Dataset>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      cell: ({ row }) => {
        const dataset = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-foreground font-medium"
            onClick={() => router.push(`/datasets/${dataset.id}`)}
          >
            {row.getValue('name')}
          </Button>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="描述" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.getValue('description') || '-'}</span>
      ),
      size: 250,
    },
    {
      accessorKey: 'datasourceId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="数据源ID" />,
      cell: ({ row }) => <span className="text-xs">{row.getValue('datasourceId')}</span>,
      size: 100,
    },
    {
      accessorKey: 'schemaJson',
      header: ({ column }) => <DataTableColumnHeader column={column} title="字段数" />,
      cell: ({ row }) => {
        const schema = row.getValue('schemaJson') as Array<{ name: string; type: string }>;
        return <Badge variant="secondary">{schema.length} 字段</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="创建时间" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatDate(row.getValue('createdAt'))}
        </span>
      ),
      size: 160,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => {
        const dataset = row.original;
        const actions: RowAction[] = [
          {
            label: '查看详情',
            icon: <RiDatabaseLine className="h-4 w-4" />,
            onClick: () => router.push(`/datasets/${dataset.id}`),
          },
          {
            label: '创建图表',
            icon: <RiAddLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/new?datasetId=${dataset.id}`),
          },
          {
            label: '删除',
            icon: <RiDatabaseLine className="h-4 w-4" />,
            onClick: () => handleDelete(dataset),
            variant: 'destructive',
          },
        ];

        return <DataTableRowActions actions={actions} />;
      },
      size: 60,
    },
  ];

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
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
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

      <DataTable
        columns={columns}
        data={datasets}
        searchKey="name"
        searchPlaceholder="搜索数据集..."
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle="删除数据集"
        deleteConfirmDescription={(count) =>
          `确定要删除选中的 ${count} 个数据集吗？此操作不可撤销。`
        }
        emptyMessage="暂无数据集，点击右上角添加"
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除数据集"
        description={`确定要删除 \"${datasetToDelete?.name}\" 吗？此操作无法撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
      />
    </div>
  );
}
