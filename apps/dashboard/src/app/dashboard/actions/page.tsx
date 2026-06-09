import ActionManager from '@/components/action/manager';
import { PageHeader } from '@/components/page-header';
import { fetchActions } from '@/lib/api/actions-api';
import { getLocaleFromRequest } from '@/i18n/server-utils';
import { getDictionary } from '@/i18n/dictionaries';
import type { ActionCapabilities } from '@/types/api';

const emptyCapabilities: ActionCapabilities = {
  canView: false,
  canExecute: false,
  canManage: false,
};

const Page = async () => {
  const locale = await getLocaleFromRequest();
  const dict = await getDictionary(locale);
  const t = (key: string) => dict[key] || key;

  const actionsResult = await fetchActions().catch(() => ({
    items: [],
    capabilities: emptyCapabilities,
  }));
  const actions = actionsResult.items || [];
  const capabilities = actionsResult.capabilities ?? emptyCapabilities;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Actions')}
        description={t('Manage reusable actions, supporting SQL, API and file operations')}
      />

      <ActionManager initial={actions} capabilities={capabilities} />
    </div>
  );
};

export default Page;
