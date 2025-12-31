import ActionManager from '@/components/action/manager';
import { PageHeader } from '@/components/page-header';
import { fetchActions } from '@/lib/api';
import { getLocaleFromRequest } from '@/i18n/server-utils';
import { getDictionary } from '@/i18n/dictionaries';

const Page = async () => {
  const locale = await getLocaleFromRequest();
  const dict = await getDictionary(locale);
  const t = (key: string) => dict[key] || key;

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
