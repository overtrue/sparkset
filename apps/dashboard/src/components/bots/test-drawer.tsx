'use client';

import { useState, useEffect, useRef } from 'react';
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
import { RiSendPlaneLine, RiLoader4Line, RiCheckLine, RiCloseLine } from '@remixicon/react';
import { testBot } from '@/lib/api/bots-api';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';
import type { Bot } from '@/types/api';

interface TestMessage {
  id: string;
  type: 'sent' | 'received' | 'error' | 'pending';
  content: string;
  timestamp: string;
  processingTimeMs?: number;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    const scrollArea = scrollRef.current;
    if (scrollArea) {
      setTimeout(() => {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }, 0);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      toast.error(t('Please enter a message'));
      return;
    }

    const messageContent = input;
    const pendingId = `pending_${Date.now()}`;

    // 添加发送消息
    const sentMsg: TestMessage = {
      id: `sent_${Date.now()}`,
      type: 'sent',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString(),
    };

    // 添加等待中的占位消息
    const pendingMsg: TestMessage = {
      id: pendingId,
      type: 'pending',
      content: t('Processing...'),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, sentMsg, pendingMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 直接调用 testBot，它现在是同步返回的
      const response = await testBot(bot.id, messageContent);

      // 移除 pending 消息并添加实际响应
      if (!response.success) {
        // 显示错误消息
        const errorMsg: TestMessage = {
          id: `error_${Date.now()}`,
          type: 'error',
          content: response.error || 'Test failed',
          timestamp: new Date().toLocaleTimeString(),
          processingTimeMs: response.processingTimeMs,
        };
        setMessages((prev) => prev.filter((m) => m.id !== pendingId).concat(errorMsg));
        toast.error(response.error || 'Test failed');
      } else {
        // 显示 bot 的响应
        const receivedMsg: TestMessage = {
          id: `received_${Date.now()}`,
          type: 'received',
          content: response.response,
          timestamp: new Date().toLocaleTimeString(),
          processingTimeMs: response.processingTimeMs,
        };
        setMessages((prev) => prev.filter((m) => m.id !== pendingId).concat(receivedMsg));
        toast.success('Response received');
      }
    } catch (error) {
      const errorMsg: TestMessage = {
        id: `error_${Date.now()}`,
        type: 'error',
        content: error instanceof Error ? error.message : 'Request failed',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => prev.filter((m) => m.id !== pendingId).concat(errorMsg));
      toast.error(t('Test request failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="flex h-screen w-[600px] flex-col">
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
                        {msg.type === 'pending' && (
                          <RiLoader4Line className="h-4 w-4 animate-spin text-muted-foreground" />
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
                              : msg.type === 'pending'
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        {msg.type !== 'pending' && (
                          <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                        )}
                        {msg.processingTimeMs !== undefined && (
                          <p className="text-xs mt-1 opacity-70">
                            {t('Processing time')}: {msg.processingTimeMs}ms
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-background p-4 space-y-3">
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
                  <RiLoader4Line className="h-4 w-4 animate-spin" />
                ) : (
                  <RiSendPlaneLine className="h-4 w-4" />
                )}
              </Button>
              {messages.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearMessages}>
                  {t('Clear')}
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2 space-y-1 text-xs text-blue-900 dark:text-blue-100">
              <p className="font-medium">{t('Test Information')}:</p>
              <ul className="space-y-0.5 ml-4 list-disc">
                <li>{t('Messages are processed synchronously through the bot engine')}</li>
                <li>{t('Helpful for verifying bot logic before production')}</li>
              </ul>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
