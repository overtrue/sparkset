'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { RiSendPlaneLine, RiLoader4Line } from '@remixicon/react';
import { testBot } from '@/lib/api/bots-api';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';
import type { Bot } from '@/types/api';

interface TestMessage {
  id: string;
  type: 'sent' | 'received' | 'error';
  content: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

const PLATFORM_OPTIONS = [
  { value: 'wecom', label: 'WeChat Work' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'custom', label: 'Custom' },
];

export function BotTestPanel({ bot }: { bot: Bot }) {
  const t = useTranslations();
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(bot.type);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      toast.error(t('Please enter a message'));
      return;
    }

    // Add sent message
    const sentMsg: TestMessage = {
      id: Date.now().toString(),
      type: 'sent',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, sentMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await testBot(bot.id, input, selectedPlatform);

      const receivedMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        type: response.success ? 'received' : 'error',
        content: response.message || response.error || 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
        details: response.details,
      };
      setMessages((prev) => [...prev, receivedMsg]);

      if (!response.success) {
        toast.error(response.error || 'Test failed');
      }
    } catch (error) {
      const errorMsg: TestMessage = {
        id: (Date.now() + 1).toString(),
        type: 'error',
        content: error instanceof Error ? error.message : 'Request failed',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      toast.error(t('Test request failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMessages = () => {
    setMessages([]);
  };

  const handlePlatformChange = (value: string) => {
    setSelectedPlatform(value as typeof selectedPlatform);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Test Bot')}</CardTitle>
          <CardDescription>{t('Test how your bot responds to messages')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Message History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t('Message History')}</p>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearMessages}>
                  {t('Clear')}
                </Button>
              )}
            </div>

            <ScrollArea className="h-96 border rounded-lg bg-muted/50 p-4">
              <div className="space-y-3">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {t('No messages yet. Send a test message to get started.')}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div
                        className={`flex gap-3 ${msg.type === 'sent' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div
                          className={`rounded-lg px-3 py-2 max-w-xs ${
                            msg.type === 'sent'
                              ? 'bg-primary text-primary-foreground'
                              : msg.type === 'error'
                                ? 'bg-destructive/20 text-destructive'
                                : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-70">{msg.timestamp}</p>
                        </div>
                      </div>

                      {/* Show details if available */}
                      {msg.details && (
                        <details className="ml-8 text-xs">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            {t('View Details')}
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                            {JSON.stringify(msg.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">{t('Message')}</label>
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
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">{t('Platform')}</label>
                <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                  <SelectTrigger className="mt-1">
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
              </div>
            </div>

            {/* Send Button */}
            <div className="flex gap-2">
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
                    {t('Sending')}
                  </>
                ) : (
                  <>
                    <RiSendPlaneLine className="h-4 w-4" />
                    {t('Send Test Message')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t('Test Information')}
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-disc">
              <li>{t('Test messages are not actually sent to external platforms')}</li>
              <li>{t('Bot responses are simulated based on bot configuration')}</li>
              <li>{t('This helps verify bot logic before deploying to production')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
