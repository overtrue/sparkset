'use client';
import { useTranslations } from '@/i18n/use-translations';
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
  const t = useTranslations();
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
        toast.success(t('Connection verified'));
      } else {
        setIsVerified(false);
      }
    } catch (err) {
      const errorMsg = (err as Error)?.message ?? t('Connection verification failed');
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
        toast.success(t('Datasource updated successfully'));
      } else {
        const created = await createDatasource(form);
        setDatasources((prev: DatasourceDTO[]) => [...prev, created]);
        toast.success(t('Datasource created successfully'));
      }
      handleCloseDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Operation failed'));
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
      toast.success(t('Sync successful'));
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Sync failed'));
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
      toast.success(t('Datasource deleted'));
      setConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Delete failed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async (rows: DatasourceDTO[]) => {
    for (const row of rows) {
      try {
        await removeDatasource(row.id);
      } catch (err) {
        toast.error(`${t('Delete failed')}: ${row.name} - ${(err as Error)?.message}`);
      }
    }
    setDatasources((prev) => prev.filter((ds) => !rows.some((r) => r.id === ds.id)));
    toast.success(t('Successfully deleted {count} datasource(s)', { count: rows.length }));
  };

  const columns: ColumnDef<DatasourceDTO>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
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
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Type')} />,
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase">
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
        size: 180,
      },
      {
        accessorKey: 'database',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Database')} />,
        cell: ({ row }) => <span>{row.getValue('database')}</span>,
        size: 140,
      },
      {
        accessorKey: 'lastSyncAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Last Synced')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.getValue('lastSyncAt'))}</span>
        ),
        size: 180,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('Actions')}</span>,
        cell: ({ row }) => {
          const ds = row.original;
          const isLoading = actionId === ds.id;

          const actions: RowAction[] = [
            {
              label: t('View Details'),
              icon: <RiEyeLine className="h-4 w-4" />,
              onClick: () => {
                window.location.href = `/datasources/${ds.id}`;
              },
            },
            {
              label: t('Edit'),
              icon: <RiEdit2Line className="h-4 w-4" />,
              onClick: () => handleOpenDialog(ds),
              disabled: isLoading,
            },
            {
              label: isLoading ? t('Syncing') : t('Sync'),
              icon: <RiRefreshLine className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />,
              onClick: () => {
                void handleSync(ds.id);
              },
              disabled: isLoading,
            },
            {
              label: t('Delete'),
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
        searchPlaceholder={t('Search datasource')}
        enableRowSelection
        onDeleteSelected={(rows) => {
          void handleDeleteSelected(rows);
        }}
        deleteConfirmTitle={t('Delete Datasource')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} datasource(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No datasources yet, click the button above to add')}
        toolbar={
          <Button onClick={() => handleOpenDialog()}>
            <RiAddLine className="h-4 w-4" />
            {t('Add Datasource')}
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? t('Edit Datasource') : t('Add Datasource')}</DialogTitle>
            <DialogDescription>
              {editingId
                ? t(
                    'Modify datasource configuration, verify connection after modification is recommended',
                  )
                : t(
                    'Fill in the information below and verify the connection to create a datasource',
                  )}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('Name')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={onChange('name')}
                  placeholder={t('e.g. production-mysql')}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">{t('Type')}</Label>
                  <Select value={form.type} onValueChange={(value) => onChange('type')(value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder={t('Select database type')} />
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
                  <Label htmlFor="port">{t('Port')}</Label>
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
                  <Label htmlFor="database">{t('Database Name')}</Label>
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
                  <Label htmlFor="username">{t('Username')}</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={onChange('username')}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">
                    {t('Password')}{' '}
                    {editingId && (
                      <span className="text-muted-foreground">
                        {t('(Leave empty to keep unchanged)')}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={onChange('password')}
                    placeholder={
                      editingId
                        ? t('Leave empty to keep unchanged')
                        : t('Leave empty for passwordless connection')
                    }
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
                        <span className="text-blue-600">{t('Verifying database connection')}</span>
                      </>
                    )}
                    {testResult?.success && !testing && (
                      <>
                        <RiCheckboxCircleLine className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">
                          {t('Connection verified successfully')}
                        </span>
                      </>
                    )}
                    {testResult?.success === false && !testing && (
                      <>
                        <RiCloseCircleLine className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">{t('Connection verification failed')}</span>
                      </>
                    )}
                  </div>
                  {testResult?.message && (
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  )}
                  {editingId && testResult?.success === false && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t(
                        'Tip: Please check the database configuration including host, port, username and password',
                      )}
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
                      onClick={() => {
                        void handleTestConnection();
                      }}
                      disabled={!canTest || testing}
                      className="w-full sm:w-auto"
                      title={t('Verify Connection')}
                    >
                      {testing ? t('Verifying') : t('Verify Connection')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      {t('Cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* 验证通过后：显示确认按钮 */}
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting
                        ? editingId
                          ? t('Updating')
                          : t('Creating')
                        : editingId
                          ? t('Save')
                          : t('Add')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      {t('Cancel')}
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
        title={t('Delete Datasource')}
        description={t('Are you sure to delete this datasource? This action cannot be undone')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}
