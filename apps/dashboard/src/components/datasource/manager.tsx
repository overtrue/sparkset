'use client';

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
import { Button } from '../ui/button';
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

export default function DatasourceManager({ initial }: { initial: DatasourceDTO[] }) {
  const [datasources, setDatasources] = useState(initial);
  const [form, setForm] = useState<CreateDatasourceInput>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canSubmit = useMemo(() => {
    // 编辑时密码可以为空（表示不修改）
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
        // 编辑模式：如果密码为空，则不包含在更新数据中
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
        password: '', // 编辑时不显示原有密码，需要重新输入
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
    // eslint-disable-next-line no-alert
    if (!globalThis.confirm('确定要删除该数据源吗？')) return;
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

  return (
    <>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              共 <span className="font-medium text-foreground">{datasources.length}</span> 个数据源
            </span>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            添加数据源
          </Button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 text-muted-foreground font-medium">名称</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">类型</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">Host</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">数据库</th>
                <th className="px-4 py-3 text-muted-foreground font-medium">最近同步</th>
                <th className="px-4 py-3 text-right text-muted-foreground font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {datasources.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={6}>
                    暂无数据源，请点击右上角"添加数据源"按钮创建。
                  </td>
                </tr>
              ) : (
                datasources.map((ds: DatasourceDTO) => (
                  <tr key={ds.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/datasources/${ds.id}`}
                        className="font-medium text-primary hover:underline cursor-pointer"
                      >
                        {ds.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 uppercase text-xs text-muted-foreground">{ds.type}</td>
                    <td className="px-4 py-3">{`${ds.host}:${ds.port}`}</td>
                    <td className="px-4 py-3">{ds.database}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(ds.lastSyncAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/datasources/${ds.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            详情
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionId === ds.id}
                          onClick={() => handleOpenDialog(ds)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          编辑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionId === ds.id}
                          onClick={() => handleSync(ds.id)}
                        >
                          <RefreshCw
                            className={`mr-2 h-4 w-4 ${actionId === ds.id ? 'animate-spin' : ''}`}
                          />
                          {actionId === ds.id ? '同步中...' : '同步'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionId === ds.id}
                          onClick={() => handleRemove(ds.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
