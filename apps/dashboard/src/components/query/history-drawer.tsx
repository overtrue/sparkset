'use client';
import { useTranslations } from '@/i18n/use-translations';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiChat3Line,
  RiCheckboxCircleLine,
  RiPlayLine,
  RiRefreshLine,
  RiTimeLine,
} from '@remixicon/react';

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
import type { ConversationDetailDTO, ConversationDTO, MessageDTO } from '@/types/api';
import { fetchConversationById, fetchConversations } from '@/lib/api/conversations-api';
import { QueryResponse } from '@/lib/query';
import { useState } from 'react';

interface HistoryDrawerProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onRerun?: (question: string) => void;
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

function isQueryResponse(obj: unknown): obj is QueryResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'sql' in obj &&
    'rows' in obj &&
    Array.isArray((obj as QueryResponse).rows)
  );
}

function getResultRowCount(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const meta = metadata as Record<string, unknown>;
  if (isQueryResponse(meta.result)) {
    return meta.result.rows.length;
  }

  return null;
}

interface MessageListProps {
  messages: MessageDTO[];
  onRerun?: (question: string) => void;
  t: ReturnType<typeof useTranslations>;
}

function MessageList({ messages, onRerun, t }: MessageListProps) {
  const items: React.ReactNode[] = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const isUser = message.role === 'user';

    if (isUser) {
      // 查找下一个助手消息的结果状态
      let rowCount: number | null = null;
      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        rowCount = getResultRowCount(messages[i + 1].metadata);
      }

      // 只显示有结果状态的用户消息
      if (rowCount !== null) {
        items.push(
          <div key={message.id} className="flex items-center gap-3 py-2 px-0">
            <RiCheckboxCircleLine className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap flex-1">
              {rowCount === 0 ? t('No Data') : t('Returned {count} rows', { count: rowCount })}
            </span>
            {onRerun && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRerun(message.content);
                }}
                className="shrink-0 flex items-center gap-1.5 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors"
                title={t('Re-run')}
              >
                <RiPlayLine className="h-3.5 w-3.5" />
                {t('Re-run')}
              </button>
            )}
          </div>,
        );
      }
    }
  }

  return <>{items}</>;
}

export function HistoryDrawer({ trigger, open, onOpenChange, onRerun }: HistoryDrawerProps) {
  const t = useTranslations();
  // 内部管理打开状态（支持 uncontrolled 模式）
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 展开详情相关状态
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [details, setDetails] = useState<Map<number, ConversationDetailDTO>>(new Map());

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchConversations();
      setConversations(res);
    } catch (err) {
      setError((err as Error)?.message ?? t('Failed to load conversation history'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);

    // 打开时加载会话列表
    if (nextOpen) {
      void loadConversations();
    }
  };

  const handleToggle = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);

    // 如果已经加载过，直接显示
    if (details.has(id)) {
      return;
    }

    setLoadingDetailId(id);
    try {
      const detail = await fetchConversationById(id);
      setDetails((prev) => new Map(prev).set(id, detail));
    } catch (err) {
      console.error('Failed to fetch conversation detail:', err);
    } finally {
      setLoadingDetailId(null);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <RiTimeLine className="h-4 w-4" />
      {t('Conversation History')}
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <RiTimeLine className="h-5 w-5" />
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
            >
              <RiRefreshLine className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 px-4">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center">
              <RiChat3Line className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">{t('No conversation history')}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('Conversations are saved automatically after queries')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => {
                const isExpanded = expandedId === conversation.id;
                const isLoadingDetail = loadingDetailId === conversation.id;
                const detail = details.get(conversation.id);

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
                    >
                      <div className="shrink-0">
                        {isExpanded ? (
                          <RiArrowDownSLine className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <RiArrowRightSLine className="h-4 w-4 text-muted-foreground" />
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
                            {formatDate(conversation.createdAt, t)}
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* 展开的消息列表 */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-2">
                        {isLoadingDetail ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            {t('Loading')}...
                          </div>
                        ) : detail?.messages?.length ? (
                          <MessageList
                            messages={detail.messages}
                            t={t}
                            onRerun={
                              onRerun
                                ? (question) => {
                                    handleOpenChange(false);
                                    onRerun(question);
                                  }
                                : undefined
                            }
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
