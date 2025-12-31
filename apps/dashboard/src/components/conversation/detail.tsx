'use client';

import type { ConversationDetailDTO } from '@/types/api';
import { MessageItem } from './message';

interface ConversationDetailProps {
  conversation: ConversationDetailDTO;
}

export function ConversationDetail({ conversation }: ConversationDetailProps) {
  if (!conversation.messages || conversation.messages.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">该会话暂无消息</div>;
  }

  return (
    <div className="space-y-4 pt-4">
      {conversation.messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
    </div>
  );
}
