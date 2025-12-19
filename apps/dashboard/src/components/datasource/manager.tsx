'use client';
import {
  RiAddLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBin2Line,
  RiEdit2Line,
  RiEyeLine,
  RiLoader4Line,
  RiRefreshLine,
} from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { type ChangeEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createDatasource,
  type CreateDatasourceInput,
  type DatasourceDTO,
  removeDatasource,
  syncDatasource,
  testConnectionByConfig,
  TestConnectionResult,
  updateDatasource,
} from '../../lib/api';
import { ConfirmDialog } from '../confirm-dialog';
import { DataTable } from '../data-table/data-table';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { DataTableRowActions, type RowAction } from '../data-table/data-table-row-actions';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// 支持的数据库类型列表
const DATABASE_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
];

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 连通性验证相关的状态
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  // 验证通过状态（单独管理，不依赖表单变化自动清除）
  const [isVerified, setIsVerified] = useState(false);

  const canTest = useMemo(() => {
    // 测试需要完整的连接信息（密码可以为空）
    if (!form.host || !form.username || !form.database) {
      return false;
    }

    // 密码不是测试连通性的必要条件，可以为空
    return true;
  }, [form]);

  const shouldShowSubmit = useMemo(() => {
    // 必须验证通过，且所有基础字段完整
    return isVerified && form.name && form.host && form.username && form.database;
  }, [isVerified, form]);

  const onChange =
    (key: keyof CreateDatasourceInput) => (e: ChangeEvent<HTMLInputElement> | string) => {
      const value = typeof e === 'string' ? e : e.target.value;

      // 智能端口切换：当切换数据库类型时自动更新默认端口
      if (key === 'type') {
        const portMap: Record<string, number> = { mysql: 3306, postgres: 5432, sqlite: 0 };
        const newPort = portMap[value as string] ?? 3306;
        setForm((prev: CreateDatasourceInput) => ({
          ...prev,
          type: value as string,
          port: newPort,
        }));
      } else {
        setForm((prev: CreateDatasourceInput) => ({
          ...prev,
          [key]: key === 'port' ? Number(value) : value,
        }));
      }

      // 用户修改配置时，重置验证状态
      setIsVerified(false);
      setTestResult(null);
    };

  const handleTestConnection = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!canTest || testing) return;
    setTesting(true);
    try {
      let result: TestConnectionResult;

      if (editingId) {
        // 编辑模式：使用测试配置（后端会处理使用存储密码或传入密码）
        const testConfig = {
          type: form.type,
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password, // 如果为空，后端会使用存储的密码
          database: form.database,
        };
        result = await testConnectionByConfig(testConfig);
      } else {
        // 创建模式：直接使用表单配置
        const testConfig = {
          type: form.type,
          host: form.host,
          port: form.port,
          username: form.username,
          password: form.password,
          database: form.database,
        };
        result = await testConnectionByConfig(testConfig);
      }

      setTestResult(result);
      if (result.success) {
        setIsVerified(true);
        toast.success('连通性验证通过');
      } else {
        setIsVerified(false);
      }
    } catch (err) {
      const errorMsg = (err as Error)?.message ?? '连通性验证失败';
      setTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shouldShowSubmit || submitting) return;
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
    // 重置验证状态
    setTestResult(null);
    setTesting(false);
    setIsVerified(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    setTestResult(null);
    setTesting(false);
    setIsVerified(false);
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

  const handleRemoveClick = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await removeDatasource(deletingId);
      setDatasources((prev: DatasourceDTO[]) =>
        prev.filter((ds: DatasourceDTO) => ds.id !== deletingId),
      );
      toast.success('数据源已删除');
      setConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? '删除失败');
    } finally {
      setDeleting(false);
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
              icon: <RiEyeLine className="h-4 w-4" />,
              onClick: () => {
                window.location.href = `/datasources/${ds.id}`;
              },
            },
            {
              label: '编辑',
              icon: <RiEdit2Line className="h-4 w-4" />,
              onClick: () => handleOpenDialog(ds),
              disabled: isLoading,
            },
            {
              label: isLoading ? '同步中...' : '同步',
              icon: <RiRefreshLine className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
              onClick: () => handleSync(ds.id),
              disabled: isLoading,
            },
            {
              label: '删除',
              icon: <RiDeleteBin2Line className="h-4 w-4" />,
              onClick: () => handleRemoveClick(ds.id),
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
            <RiAddLine className="h-4 w-4" />
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
                ? '修改数据源配置信息，修改后建议重新验证连接'
                : '填写以下信息并验证连接后，即可创建数据源'}
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
                  <Select value={form.type} onValueChange={(value) => onChange('type')(value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="选择数据库类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATABASE_TYPES.map((dbType) => (
                        <SelectItem key={dbType.value} value={dbType.value}>
                          {dbType.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    placeholder="sparkset"
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
                    placeholder={editingId ? '留空则不修改' : '留空则使用无密码连接'}
                  />
                </div>
              </div>

              {/* 连通性验证状态区域 */}
              {(testResult !== null || testing) && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                  <div className="flex items-center gap-2 font-medium">
                    {testing && (
                      <>
                        <RiLoader4Line className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-blue-600">正在验证数据库连接...</span>
                      </>
                    )}
                    {testResult?.success && !testing && (
                      <>
                        <RiCheckboxCircleLine className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">连接验证成功</span>
                      </>
                    )}
                    {testResult?.success === false && !testing && (
                      <>
                        <RiCloseCircleLine className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">连接验证失败</span>
                      </>
                    )}
                  </div>
                  {testResult?.message && (
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  )}
                  {editingId && testResult?.success === false && (
                    <p className="text-xs text-muted-foreground mt-2">
                      提示：请检查数据库配置，包括主机名、端口、用户名和密码
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 sm:flex-col-reverse sm:gap-0">
              <div className="flex gap-2 sm:flex-row-reverse">
                {!shouldShowSubmit ? (
                  <>
                    {/* 创建/编辑模式：只显示验证连通性按钮 */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={!canTest || testing}
                      className="w-full sm:w-auto"
                      title={
                        editingId && !form.password
                          ? '测试时将使用存储的密码'
                          : '验证数据库连接是否正常'
                      }
                    >
                      {testing ? '验证中...' : '验证连通性'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    {/* 验证通过后：显示确认按钮 */}
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting
                        ? editingId
                          ? '更新中...'
                          : '创建中...'
                        : editingId
                          ? '保存'
                          : '添加'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      取消
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="删除数据源"
        description="确定要删除该数据源吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}
