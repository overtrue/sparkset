import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageHeader } from '@/components/page-header';
import { QueryEmptyState } from '@/components/query/empty-state';
import { fetchAIProviders, fetchDatasources } from '@/lib/api';
import QueryRunner from './query-runner';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const QueryPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

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
          actionLink="/"
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
          actionLink="/ai-providers"
        />
      </div>
    );
  }

  return <QueryRunner datasources={datasources} aiProviders={aiProviders} initialResult={null} />;
};

export default QueryPage;
