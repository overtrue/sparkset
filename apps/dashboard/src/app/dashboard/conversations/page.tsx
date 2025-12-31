import { getLocaleFromRequest } from '@/i18n/server-utils';
import { getDictionary } from '@/i18n/dictionaries';

import { ConversationList } from '@/components/conversation/list';
import { PageHeader } from '@/components/page-header';
import { fetchConversations } from '@/lib/api/conversations-api';

const ConversationsPage = async () => {
  const locale = await getLocaleFromRequest();
  const dict = await getDictionary(locale);
  const t = (key: string) => dict[key] || key;

  const conversationsResult = await fetchConversations().catch(() => ({ items: [] }));
  const conversations = conversationsResult.items || [];

  // Sort by creation time descending
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Conversation History')}
        description={t('View and manage conversation history')}
      />
      <ConversationList conversations={sortedConversations} />
    </div>
  );
};

export default ConversationsPage;
