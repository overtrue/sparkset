import { getTranslations, setRequestLocale } from 'next-intl/server';

import ActionManager from '@/components/action/manager';
import { PageHeader } from '@/components/page-header';
import { fetchActions } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const actions = await fetchActions().catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Actions')}
        description={t('Manage reusable actions, supporting SQL, API and file operations')}
      />

      <ActionManager initial={actions} />
    </div>
  );
};

export default Page;
