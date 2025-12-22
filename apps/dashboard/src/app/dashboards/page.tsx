'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { RiAddLine, RiDashboardLine } from '@remixicon/react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { ColumnDef } from '@tanstack/react-table';
import { dashboardsApi } from '@/lib/api/dashboards';
import type { Dashboard } from '@/types/dashboard';

export default function DashboardsPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dashboardToDelete, setDashboardToDelete] = useState<Dashboard | null>(null);

  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const result = await dashboardsApi.list();
      setDashboards(result.items);
    } catch (error) {
      toast.error('加载仪表盘失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (dashboard: Dashboard) => {
    setDashboardToDelete(dashboard);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!dashboardToDelete) return;

    try {
      await dashboardsApi.delete(dashboardToDelete.id);
      toast.success('仪表盘已删除');
      loadDashboards();
    } catch (error) {
      toast.error('删除仪表盘失败');
    } finally {
      setDeleteConfirmOpen(false);
      setDashboardToDelete(null);
    }
  };

  const handleDeleteSelected = async (rows: Dashboard[]) => {
    for (const row of rows) {
      try {
        await dashboardsApi.delete(row.id);
      } catch (err) {
        toast.error(`删除 ${row.title} 失败: ${(err as Error)?.message}`);
      }
    }
    setDashboards((prev) => prev.filter((d) => !rows.some((r) => r.id === d.id)));
    toast.success(`成功删除 ${rows.length} 个仪表盘`);
  };

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const columns: ColumnDef<Dashboard>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
      cell: ({ row }) => {
        const dashboard = row.original;
        return (
          <Button
            variant="link"
            className="h-auto p-0 text-foreground font-medium"
            onClick={() => router.push(`/dashboards/${dashboard.id}`)}
          >
            {row.getValue('title')}
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
        const dashboard = row.original;
        const actions: RowAction[] = [
          {
            label: '查看',
            icon: <RiDashboardLine className="h-4 w-4" />,
            onClick: () => router.push(`/dashboards/${dashboard.id}`),
          },
          {
            label: '删除',
            icon: <RiDashboardLine className="h-4 w-4" />,
            onClick: () => handleDelete(dashboard),
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
          title="仪表盘"
          description="创建和管理数据可视化仪表盘"
          action={
            <Button disabled>
              <RiAddLine className="h-4 w-4 mr-2" />
              新建仪表盘
            </Button>
          }
        />
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="仪表盘"
          description="创建和管理数据可视化仪表盘"
          action={
            <Button onClick={() => router.push('/dashboards/new')}>
              <RiAddLine className="h-4 w-4 mr-2" />
              新建仪表盘
            </Button>
          }
        />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RiDashboardLine className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无仪表盘</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            创建您的第一个仪表盘来开始数据可视化之旅
          </p>
          <Button onClick={() => router.push('/dashboards/new')}>
            <RiAddLine className="h-4 w-4 mr-2" />
            创建仪表盘
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="仪表盘"
        description="创建和管理数据可视化仪表盘"
        action={
          <Button onClick={() => router.push('/dashboards/new')}>
            <RiAddLine className="h-4 w-4 mr-2" />
            新建仪表盘
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={dashboards}
        searchKey="title"
        searchPlaceholder="搜索仪表盘..."
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle="删除仪表盘"
        deleteConfirmDescription={(count) =>
          `确定要删除选中的 ${count} 个仪表盘吗？此操作不可撤销。`
        }
        emptyMessage="暂无仪表盘，点击右上角创建"
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="删除仪表盘"
        description={`确定要删除仪表盘 \"${dashboardToDelete?.title}\" 吗？此操作不可撤销。`}
        onConfirm={confirmDelete}
        confirmText="删除"
        cancelText="取消"
        variant="destructive"
      />
    </div>
  );
}
