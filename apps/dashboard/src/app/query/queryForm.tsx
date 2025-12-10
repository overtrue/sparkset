'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { runQuery } from '../../lib/query';

interface Props {
  datasources: { id: number; name: string }[];
  defaultDs?: number;
  onResult: (res: Awaited<ReturnType<typeof runQuery>>) => void;
  onSubmit?: (body: Parameters<typeof runQuery>[0]) => void;
  loading?: boolean;
  onDatasourceChange?: (id: number) => void;
}

const QueryForm = ({
  datasources,
  defaultDs,
  onResult,
  onSubmit,
  loading,
  onDatasourceChange,
}: Props) => {
  const [question, setQuestion] = useState('查询订单列表');
  const [datasource, setDatasource] = useState(defaultDs ?? datasources[0]?.id);
  const [limit, setLimit] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = { question, datasource, limit };
    try {
      if (onSubmit) {
        await onSubmit(body);
      } else {
        const res = await runQuery(body);
        onResult(res);
      }
    } catch (err) {
      console.error(err);
      setError('查询失败，请检查 API');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <div className="space-y-2">
        <label className="text-sm text-slate-300">问题</label>
        <textarea
          className="w-full rounded-lg bg-white/5 border border-white/10 p-2 text-sm"
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-slate-300">数据源</label>
          <select
            className="w-full rounded-lg bg-white/5 border border-white/10 p-2 text-sm"
            value={datasource}
            onChange={(e) => {
              const next = Number(e.target.value);
              setDatasource(next);
              onDatasourceChange?.(next);
            }}
          >
            {datasources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Limit</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-lg bg-white/5 border border-white/10 p-2 text-sm"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? '查询中...' : '运行查询'}
      </Button>
    </form>
  );
};

export default QueryForm;
