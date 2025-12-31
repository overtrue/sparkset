import { getLocaleFromRequest } from '@/i18n/server-utils';
import { getDictionary } from '@/i18n/dictionaries';

import { PageHeader } from '@/components/page-header';
import { QueryEmptyState } from '@/components/query/empty-state';
import { fetchAIProviders, fetchDatasources } from '@/lib/api';
import QueryRunner from './query-runner';

const QueryPage = async () => {
  const locale = await getLocaleFromRequest();
  const dict = await getDictionary(locale);
  const t = (key: string) => dict[key] || key;

  const datasources = await fetchDatasources().catch(() => []);
  const aiProviders = await fetchAIProviders().catch(() => []);

  if (datasources.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Query')}
          description={t('Query database using natural language, AI generates SQL automatically')}
        />
        <QueryEmptyState
          type="datasource"
          title={t('No Datasources')}
          description={t('Please configure a datasource before querying')}
          actionText={t('Configure Datasource')}
          actionLink="/dashboard"
        />
      </div>
    );
  }

  if (aiProviders.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Query')}
          description={t('Query database using natural language, AI generates SQL automatically')}
        />
        <QueryEmptyState
          type="provider"
          title={t('No AI Provider')}
          description={t('Please configure an AI Provider before using AI query')}
          actionText={t('Configure AI Provider')}
          actionLink="/dashboard/ai-providers"
        />
      </div>
    );
  }

  return <QueryRunner datasources={datasources} aiProviders={aiProviders} initialResult={null} />;
};

export default QueryPage;
