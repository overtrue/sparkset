import { PageHeader } from '@/components/page-header';
import { fetchAIProviders, fetchDatasources } from '@/lib/api';
import { QueryEmptyState } from '@/components/query/empty-state';
import QueryRunner from './query-runner';

const QueryPage = async () => {
  const datasources = await fetchDatasources().catch(() => []);
  const aiProviders = await fetchAIProviders().catch(() => []);

  if (datasources.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="查询" description="使用自然语言查询数据库，AI 自动生成 SQL 并执行" />
        <QueryEmptyState
          type="datasource"
          title="暂无数据源"
          description="请先配置数据源，然后才能进行查询"
          actionText="配置数据源"
          actionLink="/"
        />
      </div>
    );
  }

  if (aiProviders.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="查询" description="使用自然语言查询数据库，AI 自动生成 SQL 并执行" />
        <QueryEmptyState
          type="provider"
          title="暂无 AI Provider"
          description="请先配置 AI Provider，然后才能使用 AI 查询功能"
          actionText="配置 AI Provider"
          actionLink="/ai-providers"
        />
      </div>
    );
  }

  return <QueryRunner datasources={datasources} aiProviders={aiProviders} initialResult={null} />;
};

export default QueryPage;
