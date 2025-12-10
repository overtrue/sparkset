import Link from 'next/link';
import { runQuery } from '../../lib/query';
import { fetchDatasources } from '../../lib/api';
import QueryRunner from './queryRunner';

const QueryPage = async () => {
  const datasources = await fetchDatasources().catch(() => []);
  const firstDsId = datasources[0]?.id;

  let result: Awaited<ReturnType<typeof runQuery>> | null = null;
  if (firstDsId) {
    try {
      result = await runQuery({ question: '查询订单列表', datasource: firstDsId, limit: 5 });
    } catch (err) {
      console.warn('query failed', err);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300">Sparkline AI 运营助手</p>
          <h1 className="text-3xl font-semibold tracking-tight">查询工作台（实时）</h1>
        </div>
      </header>

      {datasources.length === 0 ? (
        <div className="card p-5 text-slate-400 space-y-3">
          <div>未获取到数据源，请确认 API 运行并至少存在一个数据源。</div>
          <Link href="/" className="text-brand-400 hover:underline text-sm">
            前往数据源页查看
          </Link>
        </div>
      ) : (
        <QueryRunner datasources={datasources} initialResult={result} />
      )}
    </div>
  );
};

export default QueryPage;
