'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type ChangeEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  type CreateDatasourceInput,
  type DatasourceDTO,
  createDatasource,
  removeDatasource,
  syncDatasource,
  updateDatasource,
} from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DataTable } from '../ui/data-table';
import { DataTableColumnHeader } from '../ui/data-table-column-header';
import { DataTableRowActions, type RowAction } from '../ui/data-table-row-actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const defaultForm: CreateDatasourceInput = {
  name: '',
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: '',
  database: '',
  isDefault: false,
};

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

interface DatasourceManagerProps {
  initial: DatasourceDTO[];
}

export default function DatasourceManager({ initial }: DatasourceManagerProps) {
  const [datasources, setDatasources] = useState(initial);
  const [form, setForm] = useState<CreateDatasourceInput>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canSubmit = useMemo(() => {
    if (editingId) {
      return form.name && form.host && form.username && form.database;
    }
    return form.name && form.host && form.username && form.database && form.password;
  }, [form, editingId]);

  const onChange = (key: keyof CreateDatasourceInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev: CreateDatasourceInput) => ({
      ...prev,
      [key]: key === 'port' ? Number(e.target.value) : e.target.value,
    }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (editingId) {
        const updateData = { ...form };
        if (!updateData.password) {
          delete (updateData as Partial<CreateDatasourceInput>).password;
        }
        const updated = await updateDatasource(editingId, updateData);
        setDatasources((prev) => prev.map((ds) => (ds.id === editingId ? updated : ds)));
        toast.success('数据源更新成功');
      } else {
        const created = await createDatasource(form);
        setDatasources((prev: DatasourceDTO[]) => [...prev, created]);
        toast.success('数据源创建成功');
      }
      handleCloseDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDialog = (datasource?: DatasourceDTO) => {
    if (datasource) {
      setEditingId(datasource.id);
      setForm({
        name: datasource.name,
        type: datasource.type,
        host: datasource.host,
        port: datasource.port,
        username: datasource.username,
        password: '',
        database: datasource.database,
        isDefault: datasource.isDefault,
      });
    } else {
      setEditingId(null);
      setForm(defaultForm);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSync = async (id: number) => {
    setActionId(id);
    try {
      const res = await syncDatasource(id);
      setDatasources((prev: DatasourceDTO[]) =>
        prev.map((ds: DatasourceDTO) =>
          ds.id === id ? { ...ds, lastSyncAt: res.lastSyncAt } : ds,
        ),
      );
      toast.success('同步成功');
    } catch (err) {
      toast.error((err as Error)?.message ?? '同步失败');
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (id: number) => {
    setActionId(id);
    try {
      await removeDatasource(id);
      setDatasources((prev: DatasourceDTO[]) => prev.filter((ds: DatasourceDTO) => ds.id !== id));
      toast.success('数据源已删除');
    } catch (err) {
      toast.error((err as Error)?.message ?? '删除失败');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteSelected = async (rows: DatasourceDTO[]) => {
    for (const row of rows) {
      try {
        await removeDatasource(row.id);
      } catch (err) {
        toast.error(`删除 ${row.name} 失败: ${(err as Error)?.message}`);
      }
    }
    setDatasources((prev) => prev.filter((ds) => !rows.some((r) => r.id === ds.id)));
    toast.success(`成功删除 ${rows.length} 个数据源`);
  };

  const columns: ColumnDef<DatasourceDTO>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
        cell: ({ row }) => (
          <Link
            href={`/datasources/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.getValue('name')}
          </Link>
        ),
        size: 180,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase text-xs">
            {row.getValue('type')}
          </Badge>
        ),
        size: 100,
      },
      {
        id: 'host',
        accessorFn: (row) => `${row.host}:${row.port}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Host" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{`${row.original.host}:${row.original.port}`}</span>
        ),
        size: 160,
      },
      {
        accessorKey: 'database',
        header: ({ column }) => <DataTableColumnHeader column={column} title="数据库" />,
        cell: ({ row }) => <span>{row.getValue('database')}</span>,
        size: 140,
      },
      {
        accessorKey: 'lastSyncAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="最近同步" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDate(row.getValue('lastSyncAt'))}
          </span>
        ),
        size: 160,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => {
          const ds = row.original;
          const isLoading = actionId === ds.id;

          const actions: RowAction[] = [
            {
              label: '查看详情',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => {
                window.location.href = `/datasources/${ds.id}`;
              },
            },
            {
              label: '编辑',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleOpenDialog(ds),
              disabled: isLoading,
            },
            {
              label: isLoading ? '同步中...' : '同步',
              icon: <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
              onClick: () => handleSync(ds.id),
              disabled: isLoading,
            },
            {
              label: '删除',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleRemove(ds.id),
              variant: 'destructive',
              disabled: isLoading,
            },
          ];

          return <DataTableRowActions actions={actions} />;
        },
        size: 60,
      },
    ],
    [actionId],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={datasources}
        searchKey="name"
        searchPlaceholder="搜索数据源..."
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle="删除数据源"
        deleteConfirmDescription={(count) =>
          `确定要删除选中的 ${count} 个数据源吗？此操作不可撤销。`
        }
        emptyMessage="暂无数据源，点击右上角添加"
        toolbar={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            添加数据源
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑数据源' : '添加数据源'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? '修改数据源配置信息'
                : '填写以下信息以连接新的数据源。创建成功后，系统将自动验证连接。'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={onChange('name')}
                  placeholder="如 production-mysql"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">类型</Label>
                  <Input id="type" value={form.type} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="port">端口</Label>
                  <Input
                    id="port"
                    type="number"
                    value={form.port}
                    onChange={onChange('port')}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={form.host}
                    onChange={onChange('host')}
                    placeholder="127.0.0.1"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="database">数据库名</Label>
                  <Input
                    id="database"
                    value={form.database}
                    onChange={onChange('database')}
                    placeholder="sparkline_demo"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">用户名</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={onChange('username')}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">
                    密码{' '}
                    {editingId && <span className="text-muted-foreground">(留空则不修改)</span>}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={onChange('password')}
                    placeholder={editingId ? '留空则不修改' : ''}
                    required={!editingId}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? '提交中...' : editingId ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
