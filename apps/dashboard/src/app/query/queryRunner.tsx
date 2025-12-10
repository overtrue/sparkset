'use client';

import { useState } from 'react';
import { Button } from '../../components/ui/button';
import QueryForm from './queryForm';
import { runQuery, QueryResponse } from '../../lib/query';

interface Props {
  datasources: { id: number; name: string }[];
  initialResult: QueryResponse | null;
  apiBase?: string;
}

export default function QueryRunner({ datasources, initialResult }: Props) {
  const [result, setResult] = useState<QueryResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (body: Parameters<typeof runQuery>[0]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await runQuery(body);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError('查询失败，请检查 API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <QueryForm
        datasources={datasources}
        defaultDs={datasources[0]?.id}
        onResult={(res) => setResult(res)}
        onSubmit={handleRun}
        loading={loading}
      />
      {error && <div className="text-sm text-red-400">{error}</div>}
      {result ? (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-400">SQL</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  handleRun({ question: '查询订单列表', datasource: datasources[0]?.id, limit: 5 })
                }
                disabled={loading}
              >
                刷新
              </Button>
            </div>
            <pre className="text-sm whitespace-pre-wrap text-slate-100/90">{result.sql}</pre>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-slate-400">结果</p>
                <h2 className="text-lg font-semibold">返回 {result.rows.length} 行</h2>
              </div>
              <Button size="sm" variant="ghost" disabled>
                导出 CSV
              </Button>
            </div>
            <div className="overflow-auto border border-white/10 rounded-xl">
              <table className="table w-full text-sm">
                <thead className="bg-white/5 text-left">
                  <tr>
                    {Object.keys(result.rows[0] ?? { 示例列: 'value' }).map((col) => (
                      <th key={col} className="px-4 py-2 capitalize">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, idx) => (
                    <tr key={idx} className="border-t border-white/10">
                      {Object.keys(result.rows[0] ?? {}).map((col) => (
                        <td key={col} className="px-4 py-3 text-slate-100/90">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-5 text-slate-400 space-y-3">
          <div>未获取到数据，请确认 API 运行并至少存在一个数据源。</div>
        </div>
      )}
    </div>
  );
}
