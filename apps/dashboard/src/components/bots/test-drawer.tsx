'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RiSendPlaneLine, RiLoader4Line, RiCheckLine, RiCloseLine } from '@remixicon/react';
import { testBot, fetchBotEvents } from '@/lib/api/bots-api';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';
import type { Bot, BotEvent } from '@/types/api';

interface TestMessage {
  id: string;
  type: 'sent' | 'processing' | 'received' | 'error';
  content: string;
  timestamp: string;
  event?: BotEvent;
}

const PLATFORM_OPTIONS = [
  { value: 'wecom', label: 'WeChat Work' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'custom', label: 'Custom' },
];

export function BotTestDrawer({
  bot,
  open,
  onOpenChange,
}: {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(bot.type);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastEventIdRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (scrollArea) {
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 0);
    }
  }, [messages]);

  // 轮询获取新的事件
  const pollForNewEvents = useCallback(async () => {
    try {
      const response = await fetchBotEvents(bot.id, 1, 50);
      const events = response.items || [];

      if (events && events.length > 0) {
        const newEvents = lastEventIdRef.current
          ? events.filter((e) => e.id > lastEventIdRef.current!)
          : [];

        if (newEvents.length > 0) {
          newEvents.forEach((event) => {
            const icon =
              event.status === 'completed' ? '✓' : event.status === 'failed' ? '✕' : '...';

            const newMsg: TestMessage = {
              id: event.id.toString(),
              type:
                event.status === 'completed'
                  ? 'received'
                  : event.status === 'failed'
                    ? 'error'
                    : 'processing',
              content: `[${icon}] Event ${event.id}: ${event.content || 'Processing...'} (${event.status})`,
              timestamp: new Date(event.createdAt).toLocaleTimeString(),
              event,
            };
            setMessages((prev) => [...prev, newMsg]);
          });

          // 更新最后的事件 ID
          lastEventIdRef.current = Math.max(
            ...newEvents.map((e) => e.id),
            lastEventIdRef.current || 0,
          );
        }
      }
    } catch (error) {
      console.error('Failed to poll for new events:', error);
    }
  }, [bot.id]);

  // 开始轮询
  const startPolling = useCallback(() => {
    // 立即轮询一次
    void pollForNewEvents();
    // 然后每 500ms 轮询一次
    pollingIntervalRef.current = setInterval(() => {
      void pollForNewEvents();
    }, 500);
  }, [pollForNewEvents]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      toast.error(t('Please enter a message'));
      return;
    }

    const messageContent = input;

    // 添加发送消息
    const sentMsg: TestMessage = {
      id: `sent_${Date.now()}`,
      type: 'sent',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, sentMsg]);
    setInput('');
    setIsLoading(true);

    // 开始轮询新事件
    startPolling();

    try {
      const response = await testBot(bot.id, messageContent, selectedPlatform);

      if (!response.success) {
        const errorMsg: TestMessage = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: response.error || 'Test failed',
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        toast.error(response.error || 'Test failed');
        stopPolling();
      } else {
        // 添加处理中的消息
        const processingMsg: TestMessage = {
          id: `processing_${Date.now()}`,
          type: 'processing',
          content: 'Message sent to webhook, waiting for processing...',
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, processingMsg]);
        toast.success(response.message);

        // 设置最后事件 ID，开始监听新事件
        lastEventIdRef.current = 0;
      }
    } catch (error) {
      const errorMsg: TestMessage = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: error instanceof Error ? error.message : 'Request failed',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error(t('Test request failed'));
      stopPolling();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
    lastEventIdRef.current = null;
    stopPolling();
  };

  const handlePlatformChange = (value: string) => {
    setSelectedPlatform(value as typeof selectedPlatform);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex h-[90vh] max-w-2xl flex-col">
        <DrawerHeader className="border-b">
          <DrawerTitle>{t('Test Bot')}</DrawerTitle>
          <DrawerDescription>
            {t(
              'Test how your bot responds to messages by sending test messages through the webhook',
            )}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Message Display Area */}
          <ScrollArea ref={scrollRef} className="flex-1 border-b bg-muted/30 p-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t('No messages yet. Send a test message to get started.')}
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="animate-in fade-in duration-200">
                    <div
                      className={`flex gap-3 ${msg.type === 'sent' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Icon */}
                      <div className="mt-1 flex-shrink-0">
                        {msg.type === 'sent' && <div className="h-2 w-2 rounded-full bg-primary" />}
                        {msg.type === 'processing' && (
                          <RiLoader4Line className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {msg.type === 'received' && (
                          <RiCheckLine className="h-4 w-4 text-green-500" />
                        )}
                        {msg.type === 'error' && <RiCloseLine className="h-4 w-4 text-red-500" />}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`rounded-lg px-3 py-2 max-w-xs ${
                          msg.type === 'sent'
                            ? 'bg-primary text-primary-foreground'
                            : msg.type === 'error'
                              ? 'bg-destructive/20 text-destructive'
                              : msg.type === 'processing'
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100'
                                : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                      </div>
                    </div>

                    {/* Show event details if available */}
                    {msg.event && (
                      <details className="ml-8 text-xs mt-1">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          {t('View Details')}
                        </summary>
                        <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1 font-mono">
                          <div>ID: {msg.event.id}</div>
                          <div>Status: {msg.event.status}</div>
                          <div>User: {msg.event.externalUserId}</div>
                          <div>Created: {new Date(msg.event.createdAt).toLocaleString()}</div>
                        </div>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-background p-4 space-y-3">
            {/* Platform Selector and Clear Button */}
            <div className="flex gap-2">
              <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearMessages}
                  className="ml-auto"
                >
                  {t('Clear')}
                </Button>
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                placeholder={t('Enter test message')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()} size="sm">
                {isLoading ? (
                  <>
                    <RiLoader4Line className="h-4 w-4 animate-spin" />
                  </>
                ) : (
                  <>
                    <RiSendPlaneLine className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2 space-y-1 text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium">{t('Test Information')}:</p>
              <ul className="space-y-0.5 ml-4 list-disc">
                <li>{t('Test messages are sent to the real webhook endpoint')}</li>
                <li>{t('Events are processed through the full bot pipeline')}</li>
                <li>{t('Helpful for verifying bot logic before production')}</li>
              </ul>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
