import { Onboarding } from '@/components/onboarding';
import { fetchDatasources } from '@/lib/api/datasources-api';
import { fetchAIProviders } from '@/lib/api/ai-providers-api';

const OnboardingPage = async () => {
  const [datasourcesResult, aiProvidersResult] = await Promise.all([
    fetchDatasources().catch(() => ({ items: [] })),
    fetchAIProviders().catch(() => ({ items: [] })),
  ]);

  return (
    <Onboarding
      datasourceCount={datasourcesResult.items?.length || 0}
      aiProviderCount={aiProvidersResult.items?.length || 0}
    />
  );
};

export default OnboardingPage;
