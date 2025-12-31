import { RiExternalLinkLine } from '@remixicon/react';
import Link from 'next/link';

import AIProviderManager from '@/components/ai-provider/manager';
import { PageHeader } from '@/components/page-header';
import { fetchAIProviders } from '@/lib/api';
import { getLocaleFromRequest } from '@/i18n/server-utils';
import { getDictionary } from '@/i18n/dictionaries';

const Page = async () => {
  const locale = await getLocaleFromRequest();
  const dict = await getDictionary(locale);
  const t = (key: string) => dict[key] || key;

  const providers = await fetchAIProviders().catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('AI Provider Configuration')}
        description={
          <>
            {t('Manage AI SDK v6 Provider configurations and set default Provider')}
            <Link
              href="https://sdk.vercel.ai/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline ml-1"
            >
              <RiExternalLinkLine className="h-3 w-3" />
              {t('View Documentation')}
            </Link>
          </>
        }
      />

      <AIProviderManager initial={providers} />
    </div>
  );
};

export default Page;
