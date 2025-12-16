'use client';

import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { ConversationDTO, ConversationDetailDTO, fetchConversation } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { ConversationDetail } from './detail';

interface ConversationListProps {
  conversations: ConversationDTO[];
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getConversationTitle(conversation: ConversationDTO): string {
  if (conversation.title) {
    return conversation.title;
  }
  return `会话 ${conversation.id}`;
}

export function ConversationList({ conversations }: ConversationListProps) {
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
      const detail = await fetchConversation(id);
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
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground">暂无会话记录</p>
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
            onOpenChange={() => handleToggle(conversation.id)}
          >
            <Card className="shadow-none">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {getConversationTitle(conversation)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(conversation.createdAt)}
                          </span>
                          {detail && (
                            <Badge variant="secondary" className="text-xs">
                              {detail.messages.length} 条消息
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
                    <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
                  ) : detail ? (
                    <ConversationDetail conversation={detail} />
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      加载失败，请重试
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
