'use client';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiChat3Line,
  RiCheckboxCircleLine,
  RiPlayLine,
  RiRefreshLine,
  RiTimeLine,
} from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchConversations } from '@/lib/api/conversations-api';
import { formatRelativeTimeText, getDocumentLocale } from '@/lib/utils/date';
import type { ConversationDTO, MessageDTO } from '@/types/api';
import { parseQueryError, type QueryError } from '@/lib/query-errors';
import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApiListResponse } from '@/types/api';
import { useConversationDetails } from '@/hooks/use-conversation-details';
import { buildQueryResultCountLabel } from './result-count';
import { extractQueryTurns, getRerunContextFromMetadata } from '@/lib/query-message-metadata';

interface HistoryDrawerProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRerun?: (
    question: string,
    conversationId: number,
    datasourceId?: number,
    aiProviderId?: number,
    limit?: number,
  ) => void;
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

function isConversationListResponse(data: unknown): data is ApiListResponse<ConversationDTO> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'items' in data &&
    Array.isArray((data as ApiListResponse<ConversationDTO>).items)
  );
}

interface MessageListProps {
  messages: MessageDTO[];
  onRerun?: (
    question: string,
    conversationId: number,
    datasourceId?: number,
    aiProviderId?: number,
    limit?: number,
  ) => void;
  t: ReturnType<typeof useTranslations>;
}

const MessageList = memo(function MessageList({ messages, onRerun, t }: MessageListProps) {
  const items: ReactNode[] = [];
  const queryTurns = extractQueryTurns(messages);

  if (queryTurns.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        {t('No messages in this conversation')}
      </div>
    );
  }

  for (const queryTurn of queryTurns) {
    const message = messages[queryTurn.index - 1];
    const assistantMessage = messages[queryTurn.index];
    const rerunContext = getRerunContextFromMetadata(queryTurn.metadata);
    const { rowCount } = queryTurn;
    const question = message?.content ?? '';
    if (!assistantMessage) {
      continue;
    }

    items.push(
      <div key={assistantMessage.id} className="flex items-center gap-3 py-2 px-0">
        <RiCheckboxCircleLine className="h-3.5 w-3.5 text-green-500 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {buildQueryResultCountLabel(t, rowCount, 'history')}
          </span>
          {queryTurn.metadata?.summary ? (
            <p className="text-[11px] text-muted-foreground/80 mt-0.5 whitespace-nowrap truncate">
              {queryTurn.metadata?.summary}
            </p>
          ) : null}
        </div>
        {onRerun && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRerun(
                question,
                assistantMessage.conversationId,
                rerunContext.datasourceId,
                rerunContext.aiProviderId,
                rerunContext.limit,
              );
            }}
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
            title={t('Re-run')}
          >
            <RiPlayLine className="h-3.5 w-3.5" aria-hidden="true" />
            {t('Re-run')}
          </button>
        )}
      </div>,
    );
  }

  return <>{items}</>;
});

export function HistoryDrawer({ trigger, open, onOpenChange, onRerun }: HistoryDrawerProps) {
  const t = useTranslations();
  const locale = useMemo(() => getDocumentLocale(), []);
  // 内部管理打开状态（支持 uncontrolled 模式）
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<QueryError | null>(null);

  // 展开详情相关状态
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const {
    details,
    detailErrors,
    loadingId: loadingDetailId,
    loadConversationDetail,
    clearConversationDetails,
  } = useConversationDetails({
    t,
    fallbackErrorMessage: t('Failed to load, please retry'),
  });

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    clearConversationDetails();
    try {
      const res = await fetchConversations();
      if (!isConversationListResponse(res)) {
        throw new Error(t('Unexpected response format'));
      }

      setConversations(res.items);
    } catch (err) {
      setConversations([]);
      setExpandedId(null);
      const parsedError = parseQueryError(err, t('Failed to load conversation history'), t);
      setError(parsedError);
    } finally {
      setLoading(false);
    }
  }, [clearConversationDetails, t]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (isOpen) {
      void loadConversations();
    }
  }, [isOpen, loadConversations]);

  const handleToggle = useCallback(
    async (id: number) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }

      setExpandedId(id);
      await loadConversationDetail(id);
    },
    [expandedId, loadConversationDetail],
  );

  const handleRetryDetail = useCallback(
    (id: number) => {
      setExpandedId(id);
      void loadConversationDetail(id, { force: true });
    },
    [loadConversationDetail],
  );

  const handleRerun = useCallback(
    (
      question: string,
      conversationId: number,
      datasourceId?: number,
      aiProviderId?: number,
      limit?: number,
    ) => {
      handleOpenChange(false);
      onRerun?.(question, conversationId, datasourceId, aiProviderId, limit);
    },
    [handleOpenChange, onRerun],
  );

  const defaultTrigger = useMemo(
    () => (
      <Button variant="outline" size="sm" className="gap-2">
        <RiTimeLine className="h-4 w-4" aria-hidden="true" />
        {t('Conversation History')}
      </Button>
    ),
    [t],
  );

  const refreshLabel = t('Refresh');
  const emptyState = (
    <div className="py-12 text-center">
      <RiChat3Line className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{t('No conversation history')}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {t('Conversations are saved automatically after queries')}
      </p>
    </div>
  );

  const loadingState = (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  const listContent = (
    <div className="space-y-1">
      {conversations.map((conversation) => {
        const isExpanded = expandedId === conversation.id;
        const isLoadingDetail = loadingDetailId === conversation.id;
        const detail = details.get(conversation.id);
        const detailError = detailErrors.get(conversation.id);
        const detailId = `conversation-${conversation.id}`;

        return (
          <div
            key={conversation.id}
            className="border border-border/50 rounded-lg overflow-hidden hover:border-border transition-colors"
          >
            {/* 会话头部 - 可点击展开 */}
            <button
              type="button"
              className="w-full py-3 px-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
              onClick={() => void handleToggle(conversation.id)}
              aria-expanded={isExpanded}
              aria-controls={detailId}
            >
              <div className="shrink-0">
                {isExpanded ? (
                  <RiArrowDownSLine className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <RiArrowRightSLine className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm text-foreground truncate flex-1">
                    {getConversationTitle(conversation, t)}
                  </span>
                  {detail && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {t('{count} messages', { count: detail.messages.length })}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatRelativeTimeText(conversation.createdAt, t, locale)}
                  </span>
                </div>
              </div>
            </button>

            {/* 展开的消息列表 */}
            {isExpanded && (
              <div id={detailId} className="px-3 pb-3 pt-2">
                {isLoadingDetail ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {t('Loading…')}
                  </div>
                ) : detailError ? (
                  <div className="py-4 text-center text-xs text-destructive">
                    <p>{detailError.message}</p>
                    {detailError.details && detailError.details.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-left max-w-full px-1">
                        {detailError.details.map((detail, index) => (
                          <li
                            key={`${index}-${detail}`}
                            className="list-disc list-inside break-all"
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
                      onClick={() => handleRetryDetail(conversation.id)}
                    >
                      {t('Retry')}
                    </Button>
                  </div>
                ) : detail?.messages?.length ? (
                  <MessageList
                    messages={detail.messages}
                    t={t}
                    onRerun={onRerun ? handleRerun : undefined}
                  />
                ) : (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {detail
                      ? t('No messages in this conversation')
                      : t('Failed to load, please retry')}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto overscroll-contain">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <RiTimeLine className="h-5 w-5" aria-hidden="true" />
                {t('Conversation History')}
              </SheetTitle>
              <SheetDescription className="mt-2">
                {t('View previous query sessions')}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                void loadConversations();
              }}
              disabled={loading}
              aria-label={refreshLabel}
            >
              <RiRefreshLine
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 px-4">
          {error ? (
            <div
              className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm"
              role="status"
              aria-live="polite"
            >
              <p>{error.message}</p>
              {(error.status || error.code) && (
                <p className="text-xs text-destructive/80 mt-1">
                  {error.status && `HTTP ${error.status}`}
                  {error.status && error.code ? ' · ' : ''}
                  {error.code}
                </p>
              )}
              {error.details && error.details.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-destructive/80">
                  {error.details.map((detailText, index) => (
                    <li key={`${index}-${detailText}`} className="list-disc list-inside">
                      {detailText}
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void loadConversations();
                  }}
                  disabled={loading}
                >
                  {t('Retry')}
                </Button>
              </div>
            </div>
          ) : loading ? (
            loadingState
          ) : conversations.length === 0 ? (
            emptyState
          ) : (
            listContent
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
