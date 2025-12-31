import { Onboarding } from '@/components/onboarding';
import { fetchAIProviders, fetchDatasources } from '@/lib/api';

const OnboardingPage = async () => {
  const [datasources, aiProviders] = await Promise.all([
    fetchDatasources().catch(() => []),
    fetchAIProviders().catch(() => []),
  ]);

  return <Onboarding datasourceCount={datasources.length} aiProviderCount={aiProviders.length} />;
};

export default OnboardingPage;
