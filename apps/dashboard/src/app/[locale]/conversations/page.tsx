import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ConversationList } from '@/components/conversation/list';
import { PageHeader } from '@/components/page-header';
import { fetchConversations } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const ConversationsPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const conversations = await fetchConversations().catch(() => []);

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
