'use client';

import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import QueryForm from './queryForm';
import { runQuery, QueryResponse } from '../../lib/query';
import { fetchSchema, TableSchemaDTO } from '../../lib/api';

interface Props {
  datasources: { id: number; name: string }[];
  initialResult: QueryResponse | null;
  apiBase?: string;
}

export default function QueryRunner({ datasources, initialResult }: Props) {
  const [result, setResult] = useState<QueryResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDatasource, setActiveDatasource] = useState<number | undefined>(datasources[0]?.id);
  const [schema, setSchema] = useState<TableSchemaDTO[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const loadSchema = async (id?: number) => {
    if (!id) return;
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const res = await fetchSchema(id);
      setSchema(res);
    } catch (err) {
      setSchemaError((err as Error)?.message ?? '加载 Schema 失败');
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    void loadSchema(activeDatasource);
  }, [activeDatasource]);

  const handleRun = async (body: Parameters<typeof runQuery>[0]) => {
    setActiveDatasource(body.datasource);
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
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <QueryForm
          datasources={datasources}
          defaultDs={datasources[0]?.id}
          onResult={(res) => setResult(res)}
          onSubmit={handleRun}
          loading={loading}
          onDatasourceChange={(id) => setActiveDatasource(id)}
        />

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Schema 缓存</p>
              <h2 className="text-lg font-semibold">
                {activeDatasource ? `数据源 #${activeDatasource}` : '未选择'}
              </h2>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => loadSchema(activeDatasource)}
              disabled={schemaLoading}
            >
              {schemaLoading ? '刷新中...' : '刷新'}
            </Button>
          </div>
          {schemaError && <div className="text-sm text-red-400">{schemaError}</div>}
          {schemaLoading ? (
            <div className="text-sm text-slate-400">加载中...</div>
          ) : schema.length === 0 ? (
            <div className="text-sm text-slate-400">
              暂无缓存的表结构，先执行一次同步或查询触发缓存。
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
              {schema.map((table) => (
                <div
                  key={table.tableName}
                  className="rounded-lg border border-white/10 p-3 bg-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{table.tableName}</div>
                    <span className="text-xs text-slate-400">{table.columns.length} 列</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {table.columns.map((col) => (
                      <span
                        key={col.name}
                        className="rounded-full border border-white/10 px-2 py-1 bg-white/5 text-slate-100/90"
                      >
                        {col.name}
                        <span className="text-slate-400"> ({col.type})</span>
                        {col.comment ? (
                          <span className="ml-1 text-slate-400">· {col.comment}</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
                {result.summary && <p className="text-xs text-slate-500 mt-1">{result.summary}</p>}
              </div>
              <Button size="sm" variant="ghost" disabled>
                导出 CSV
              </Button>
            </div>
            {result.rows.length === 0 ? (
              <div className="text-sm text-slate-400">查询成功但无数据返回。</div>
            ) : (
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
            )}
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
