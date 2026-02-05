'use client';
import { RiArrowDownSLine, RiArrowRightSLine, RiChat3Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';

import { useState } from 'react';
import { fetchConversationById } from '../../lib/api/conversations-api';
import type { ConversationDTO, ConversationDetailDTO } from '@/types/api';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ConversationDetail } from './detail';

interface ConversationListProps {
  conversations: ConversationDTO[];
}

function formatDate(dateString: string, t: ReturnType<typeof useTranslations>): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t('Just now');
  if (diffMins < 60) return t('{n} minutes ago', { n: diffMins });
  if (diffHours < 24) return t('{n} hours ago', { n: diffHours });
  if (diffDays < 7) return t('{n} days ago', { n: diffDays });

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getConversationTitle(
  conversation: ConversationDTO,
  t: ReturnType<typeof useTranslations>,
): string {
  if (conversation.title) {
    return conversation.title;
  }
  return t('Conversation {id}', { id: conversation.id });
}

export function ConversationList({ conversations }: ConversationListProps) {
  const t = useTranslations();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [details, setDetails] = useState<Map<number, ConversationDetailDTO>>(new Map());

  const handleToggle = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    setLoadingId(id);

    // 如果已经加载过，直接显示
    if (details.has(id)) {
      setLoadingId(null);
      return;
    }

    try {
      const detail = await fetchConversationById(id);
      setDetails((prev) => new Map(prev).set(id, detail));
    } catch (error) {
      console.error('Failed to fetch conversation detail:', error);
    } finally {
      setLoadingId(null);
    }
  };

  if (conversations.length === 0) {
    return (
      <Card className="shadow-none">
        <CardContent className="py-12 text-center">
          <RiChat3Line
            className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">{t('No conversation history')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => {
        const isExpanded = expandedId === conversation.id;
        const isLoading = loadingId === conversation.id;
        const detail = details.get(conversation.id);

        return (
          <Collapsible
            key={conversation.id}
            open={isExpanded}
            onOpenChange={() => {
              void handleToggle(conversation.id);
            }}
          >
            <Card className="shadow-none">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        {isExpanded ? (
                          <RiArrowDownSLine
                            className="h-4 w-4 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <RiArrowRightSLine
                            className="h-4 w-4 text-muted-foreground shrink-0"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {getConversationTitle(conversation, t)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(conversation.createdAt, t)}
                          </span>
                          {detail && (
                            <Badge variant="secondary" className="text-xs">
                              {t('{count} messages', { count: detail.messages.length })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                <CardContent className="pt-0 pb-4">
                  {isLoading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {t('Loading…')}
                    </div>
                  ) : detail ? (
                    <ConversationDetail conversation={detail} />
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {t('Failed to load, please retry')}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
