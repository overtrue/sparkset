'use client';

import { type ChangeEvent, useMemo, useState } from 'react';
import {
  type CreateDatasourceInput,
  type DatasourceDTO,
  createDatasource,
  removeDatasource,
  syncDatasource,
} from '../lib/api';
import { Button } from './ui/button';

const defaultForm: CreateDatasourceInput = {
  name: '',
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: '',
  database: '',
};

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60';

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export default function DatasourceManager({ initial }: { initial: DatasourceDTO[] }) {
  const [datasources, setDatasources] = useState(initial);
  const [form, setForm] = useState<CreateDatasourceInput>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => form.name && form.host && form.username && form.database && form.password,
    [form],
  );

  const onChange = (key: keyof CreateDatasourceInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({
      ...prev,
      [key]: key === 'port' ? Number(e.target.value) : e.target.value,
    }));

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || creating) return;
    setCreating(true);
    setMessage(null);
    try {
      const created = await createDatasource(form);
      setDatasources((prev) => [...prev, created]);
      setForm((prev) => ({
        ...defaultForm,
        host: prev.host,
        port: prev.port,
        username: prev.username,
      }));
      setMessage('数据源创建成功');
    } catch (err) {
      setMessage((err as Error)?.message ?? '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleSync = async (id: number) => {
    setActionId(id);
    setMessage(null);
    try {
      const res = await syncDatasource(id);
      setDatasources((prev) =>
        prev.map((ds) => (ds.id === id ? { ...ds, lastSyncAt: res.lastSyncAt } : ds)),
      );
      setMessage('已触发同步');
    } catch (err) {
      setMessage((err as Error)?.message ?? '同步失败');
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('确定要删除该数据源吗？')) return;
    setActionId(id);
    setMessage(null);
    try {
      await removeDatasource(id);
      setDatasources((prev) => prev.filter((ds) => ds.id !== id));
      setMessage('已删除');
    } catch (err) {
      setMessage((err as Error)?.message ?? '删除失败');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
      <form className="card p-5 space-y-4" onSubmit={handleCreate}>
        <div>
          <p className="text-sm text-slate-400">连接新数据源</p>
          <h2 className="text-xl font-semibold">添加数据源</h2>
        </div>
        <div className="space-y-3">
          <label className="space-y-1 block">
            <span className="text-sm text-slate-300">名称</span>
            <input
              value={form.name}
              onChange={onChange('name')}
              placeholder="如 production-mysql"
              className={inputCls}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-sm text-slate-300">类型</span>
              <input value={form.type} readOnly className={inputCls} />
            </label>
            <label className="space-y-1 block">
              <span className="text-sm text-slate-300">端口</span>
              <input
                type="number"
                value={form.port}
                onChange={onChange('port')}
                className={inputCls}
                min={1}
                required
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-sm text-slate-300">Host</span>
              <input
                value={form.host}
                onChange={onChange('host')}
                placeholder="127.0.0.1"
                className={inputCls}
                required
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-sm text-slate-300">数据库名</span>
              <input
                value={form.database}
                onChange={onChange('database')}
                placeholder="sparkline_demo"
                className={inputCls}
                required
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="text-sm text-slate-300">用户名</span>
              <input
                value={form.username}
                onChange={onChange('username')}
                className={inputCls}
                required
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-sm text-slate-300">密码</span>
              <input
                type="password"
                value={form.password}
                onChange={onChange('password')}
                className={inputCls}
                required
              />
            </label>
          </div>
        </div>
        <Button type="submit" disabled={!canSubmit || creating} className="w-full">
          {creating ? '创建中...' : '创建数据源'}
        </Button>
        {message && <div className="text-sm text-slate-300">{message}</div>}
      </form>

      <div className="card p-5 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">已连接的数据源</p>
            <h2 className="text-xl font-semibold">数据源列表</h2>
          </div>
          <span className="text-xs text-slate-400">共 {datasources.length} 个</span>
        </div>
        <div className="overflow-auto">
          <table className="table w-full text-sm">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="px-4 py-2">名称</th>
                <th className="px-4 py-2">类型</th>
                <th className="px-4 py-2">Host</th>
                <th className="px-4 py-2">数据库</th>
                <th className="px-4 py-2">最近同步</th>
                <th className="px-4 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {datasources.length === 0 ? (
                <tr>
                  <td className="px-4 py-3 text-slate-400" colSpan={6}>
                    暂无数据源，请先添加。
                  </td>
                </tr>
              ) : (
                datasources.map((ds) => (
                  <tr key={ds.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium">{ds.name}</td>
                    <td className="px-4 py-3 uppercase text-xs text-slate-300">{ds.type}</td>
                    <td className="px-4 py-3 text-slate-200">{`${ds.host}:${ds.port}`}</td>
                    <td className="px-4 py-3 text-slate-200">{ds.database}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {formatDate(ds.lastSyncAt)}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={actionId === ds.id}
                        onClick={() => handleSync(ds.id)}
                      >
                        {actionId === ds.id ? '同步中...' : '同步'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actionId === ds.id}
                        onClick={() => handleRemove(ds.id)}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
