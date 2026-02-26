'use client';

import type { ConversationDetailDTO } from '@/types/api';
import { useTranslations } from '@/i18n/use-translations';
import { MessageItem } from './message';

interface ConversationDetailProps {
  conversation: ConversationDetailDTO;
}

export function ConversationDetail({ conversation }: ConversationDetailProps) {
  const t = useTranslations();

  if (!conversation.messages || conversation.messages.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('No messages in this conversation')}
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-4">
      {conversation.messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
