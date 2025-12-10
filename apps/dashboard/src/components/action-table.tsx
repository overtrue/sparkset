'use client';

import { useState } from 'react';
import { ActionDTO, executeAction } from '../lib/api';
import { Button } from './ui/button';

interface Props {
  actions: ActionDTO[];
}

export default function ActionTable({ actions }: Props) {
  const [runningId, setRunningId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<unknown>(null);

  const handleExecute = async (id: number) => {
    setRunningId(id);
    setMessage(null);
    setResultPreview(null);
    try {
      const res = await executeAction(id);
      setResultPreview(res);
      setMessage('执行成功');
    } catch (err) {
      setMessage((err as Error)?.message ?? '执行失败');
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">模板列表</p>
          <h2 className="text-xl font-semibold">已保存的动作模板</h2>
        </div>
        {message && <span className="text-sm text-slate-300">{message}</span>}
      </div>
      <div className="overflow-auto border border-white/10 rounded-xl">
        <table className="table w-full text-sm">
          <thead className="bg-white/5 text-left">
            <tr>
              <th className="px-4 py-2">名称</th>
              <th className="px-4 py-2">类型</th>
              <th className="px-4 py-2">描述</th>
              <th className="px-4 py-2">最近更新</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-slate-400" colSpan={5}>
                  暂无模板，可通过 API/CLI 创建。
                </td>
              </tr>
            ) : (
              actions.map((action) => (
                <tr key={action.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium">{action.name}</td>
                  <td className="px-4 py-3 uppercase text-xs text-slate-300">{action.type}</td>
                  <td className="px-4 py-3 text-slate-200">{action.description ?? '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {action.updatedAt ?? action.createdAt ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={runningId === action.id}
                      onClick={() => handleExecute(action.id)}
                    >
                      {runningId === action.id ? '执行中...' : '执行'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {resultPreview && (
        <div className="card bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">执行结果</span>
            <Button size="sm" variant="ghost" onClick={() => setResultPreview(null)}>
              清除
            </Button>
          </div>
          <pre className="text-xs whitespace-pre-wrap text-slate-100/90">
            {JSON.stringify(resultPreview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
