'use client';

import { PageHeader } from '@/components/page-header';
import { QueryEmptyState } from '@/components/query/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { useAIProviders } from '@/lib/api/ai-providers-hooks';
import { useDatasources } from '@/lib/api/datasources-hooks';
import { useTranslations } from '@/i18n/use-translations';
import QueryRunner from './query-runner';

const QueryPage = () => {
  const t = useTranslations();
  const {
    data: datasourcesResult,
    error: datasourcesError,
    isLoading: datasourcesLoading,
  } = useDatasources();
  const {
    data: aiProvidersResult,
    error: aiProvidersError,
    isLoading: aiProvidersLoading,
  } = useAIProviders();
  const datasources = datasourcesResult?.items || [];
  const aiProviders = aiProvidersResult?.items || [];
  const isLoading = datasourcesLoading || aiProvidersLoading;
  const error = datasourcesError || aiProvidersError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Query')}
          description={t('Query database using natural language, AI generates SQL automatically')}
        />
        <LoadingState message={t('Loading…')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Query')}
          description={t('Query database using natural language, AI generates SQL automatically')}
        />
        <ErrorState error={error} title={t('Failed to load query resources')} />
      </div>
    );
  }

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
          actionHref="/dashboard/datasources"
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
          actionHref="/dashboard/ai-providers"
        />
      </div>
    );
  }

  return <QueryRunner datasources={datasources} aiProviders={aiProviders} initialResult={null} />;
};

export default QueryPage;
