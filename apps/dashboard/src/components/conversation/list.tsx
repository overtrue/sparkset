'use client';
import { RiArrowDownSLine, RiArrowRightSLine, RiChat3Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';

import { useMemo, useState } from 'react';
import type { ConversationDTO } from '@/types/api';
import { formatRelativeTimeText, getDocumentLocale } from '@/lib/utils/date';
import { useConversationDetails } from '@/hooks/use-conversation-details';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ConversationDetail } from './detail';

interface ConversationListProps {
  conversations: ConversationDTO[];
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
  const { details, detailErrors, loadingId, loadConversationDetail } = useConversationDetails({
    t,
    fallbackErrorMessage: t('Failed to load, please retry'),
  });
  const locale = useMemo(() => getDocumentLocale(), []);

  const handleRetry = async (id: number) => {
    setExpandedId(id);
    await loadConversationDetail(id, { force: true });
  };

  const handleToggle = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    await loadConversationDetail(id);
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
        const detailError = detailErrors.get(conversation.id);

        return (
          <Collapsible
            key={conversation.id}
            open={isExpanded}
            onOpenChange={(nextOpen) => {
              if (nextOpen) {
                void handleToggle(conversation.id);
                return;
              }

              if (expandedId === conversation.id) {
                setExpandedId(null);
              }
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
                            {formatRelativeTimeText(conversation.createdAt, t, locale)}
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
                  ) : detailError ? (
                    <div className="py-8 text-center text-sm text-destructive">
                      <p>{detailError.message}</p>
                      {(detailError.status || detailError.code) && (
                        <p className="text-xs text-destructive/80 mt-1">
                          {detailError.status && `HTTP ${detailError.status}`}
                          {detailError.status && detailError.code ? ' · ' : ''}
                          {detailError.code}
                        </p>
                      )}
                      {detailError.details && detailError.details.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-left px-1">
                          {detailError.details.map((detail, index) => (
                            <li
                              key={`${index}-${detail}`}
                              className="list-disc list-inside break-all text-xs"
                            >
                              {detail}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          void handleRetry(conversation.id);
                        }}
                      >
                        {t('Retry')}
                      </Button>
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
