'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RiAddLine,
  RiBarChartLine,
  RiLineChartLine,
  RiPieChartLine,
  RiTableLine,
} from '@remixicon/react';
import Link from 'next/link';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import type { Chart, Dataset } from '@/types/chart';
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

export default function ChartsPage() {
  const router = useRouter();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [chartToDelete, setChartToDelete] = useState<Chart | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [datasetsResult, chartsResult] = await Promise.all([
        datasetsApi.list(),
        chartsApi.list(),
      ]);
      setDatasets(datasetsResult.items);
      setCharts(chartsResult.items);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getDatasetName = (datasetId: number) => {
    const dataset = datasets.find((d) => d.id === datasetId);
    return dataset?.name || '未知数据集';
  };

  const getChartIcon = (chartType: Chart['chartType']) => {
    const props = { className: 'h-4 w-4' };
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

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const handleDelete = async (chart: Chart) => {
    setChartToDelete(chart);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!chartToDelete) return;

    try {
      await chartsApi.delete(chartToDelete.id);
      toast.success('图表已删除');
      setDeleteConfirmOpen(false);
      setChartToDelete(null);
      loadData();
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const handleDeleteSelected = async (rows: Chart[]) => {
    for (const row of rows) {
      try {
        await chartsApi.delete(row.id);
      } catch (err) {
        toast.error(`删除 ${row.title} 失败: ${(err as Error)?.message}`);
      }
    }
    setCharts((prev) => prev.filter((c) => !rows.some((r) => r.id === c.id)));
    toast.success(`成功删除 ${rows.length} 个图表`);
  };

  const columns: ColumnDef<Chart>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="图表名称" />,
      cell: ({ row }) => {
        const chart = row.original;
        return (
          <div className="flex items-center gap-2">
            {getChartIcon(chart.chartType)}
            <Button
              variant="link"
              className="h-auto p-0 text-foreground font-medium"
              onClick={() => router.push(`/charts/${chart.id}`)}
            >
              {row.getValue('title')}
            </Button>
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'chartType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
      cell: ({ row }) => {
        const chartType = row.original.chartType;
        return <Badge variant={getChartBadgeVariant(chartType)}>{chartType.toUpperCase()}</Badge>;
      },
      size: 100,
    },
    {
      accessorKey: 'datasetId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="数据集" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {getDatasetName(row.getValue('datasetId'))}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="描述" />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.getValue('description') || '-'}</span>
      ),
      size: 200,
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
        const chart = row.original;
        const actions: RowAction[] = [
          {
            label: '查看详情',
            icon: <RiBarChartLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/${chart.id}`),
          },
          {
            label: '编辑',
            icon: <RiBarChartLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/${chart.id}/edit`),
          },
          {
            label: '基于此创建',
            icon: <RiAddLine className="h-4 w-4" />,
            onClick: () => router.push(`/charts/new?datasetId=${chart.datasetId}`),
          },
          {
            label: '删除',
            icon: <RiBarChartLine className="h-4 w-4" />,
            onClick: () => handleDelete(chart),
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
          title="图表管理"
          description="创建和管理基于数据集的可视化图表"
          action={
            <Button asChild disabled>
              <Link href="/charts/new">
                <RiAddLine className="h-4 w-4 mr-2" />
                创建图表
              </Link>
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
          title="图表管理"
          description="创建和管理基于数据集的可视化图表"
          action={
            <Button asChild>
              <Link href="/query">
                <RiAddLine className="h-4 w-4 mr-2" />
                去创建数据集
              </Link>
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle>暂无数据集</CardTitle>
            <CardDescription>请先从查询页面创建数据集，然后才能创建图表</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/query">
                <RiAddLine className="h-4 w-4 mr-2" />
                执行查询并创建数据集
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="图表管理"
          description="创建和管理基于数据集的可视化图表"
          action={
            <Button asChild>
              <Link href="/charts/new">
                <RiAddLine className="h-4 w-4 mr-2" />
                创建图表
              </Link>
            </Button>
          }
        />

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiBarChartLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无图表</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            创建您的第一个图表来开始数据可视化之旅
          </p>
          <Button asChild>
            <Link href="/charts/new">
              <RiAddLine className="h-4 w-4 mr-2" />
              创建图表
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="图表管理"
        description="创建和管理基于数据集的可视化图表"
        action={
          <Button asChild>
            <Link href="/charts/new">
              <RiAddLine className="h-4 w-4 mr-2" />
              创建图表
            </Link>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={charts}
        searchKey="title"
        searchPlaceholder="搜索图表..."
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle="删除图表"
        deleteConfirmDescription={(count) => `确定要删除选中的 ${count} 个图表吗？此操作不可撤销。`}
        emptyMessage="暂无图表，点击右上角创建"
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除图表"
        description={`确定要删除图表 \"${chartToDelete?.title}\" 吗？此操作不可撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
      />
    </div>
  );
}
