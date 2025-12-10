import DatasourceManager from '../components/datasource-manager';
import { fetchDatasources } from '../lib/api';

const Page = async () => {
  const datasources = await fetchDatasources().catch(() => []);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-300">Sparkline AI 运营助手</p>
          <h1 className="text-3xl font-semibold tracking-tight">数据源管理</h1>
        </div>
        <p className="text-sm text-slate-500">
          NEXT_PUBLIC_API_URL 指向的 API 将用于创建/同步数据源
        </p>
      </header>

      <DatasourceManager initial={datasources} />
    </div>
  );
};

export default Page;
