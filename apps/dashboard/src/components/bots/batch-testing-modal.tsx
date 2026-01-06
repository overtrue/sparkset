'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  RiAddLine,
  RiPlayLine,
  RiDeleteBin2Line,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
} from '@remixicon/react';
import { testBot } from '@/lib/api/bots-api';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';
import type { Bot, BotPlatform } from '@/types/api';

interface BatchTestMessage {
  id: string;
  content: string;
  platform?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

interface BatchTestingModalProps {
  bot: Bot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchTestingModal({ bot, open, onOpenChange }: BatchTestingModalProps) {
  const t = useTranslations();
  const [messages, setMessages] = useState<BatchTestMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState(bot.type);
  const [isRunning, setIsRunning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const addMessage = useCallback(() => {
    if (!newMessage.trim()) {
      toast.error(t('Please enter a message'));
      return;
    }

    const id = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id,
        content: newMessage,
        platform: selectedPlatform,
        status: 'pending',
      },
    ]);
    setNewMessage('');
  }, [newMessage, selectedPlatform, t]);

  const removeMessage = (id: string) => {
    if (isRunning && runningId === id) {
      toast.error(t('Cannot remove message while testing'));
      return;
    }
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const runBatch = async () => {
    const pendingMessages = messages.filter((msg) => msg.status === 'pending');
    if (pendingMessages.length === 0) {
      toast.error(t('No pending messages to test'));
      return;
    }

    setIsRunning(true);

    for (const msg of messages) {
      if (msg.status !== 'pending') continue;

      setRunningId(msg.id);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'running' } : m)));

      try {
        const result = await testBot(bot.id, msg.content, msg.platform);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  status: result.success ? 'completed' : 'failed',
                  result: result.message,
                  error: result.error,
                }
              : m,
          ),
        );
      } catch (error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  ...m,
                  status: 'failed',
                  error: error instanceof Error ? error.message : t('Unknown error'),
                }
              : m,
          ),
        );
      }
    }

    setRunningId(null);
    setIsRunning(false);
    toast.success(t('Batch testing completed'));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <RiCheckLine className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <RiCloseLine className="h-4 w-4 text-red-600" />;
      case 'running':
        return <RiLoader4Line className="h-4 w-4 text-yellow-600 animate-spin" />;
      default:
        return null;
    }
  };

  const stats = {
    total: messages.length,
    completed: messages.filter((m) => m.status === 'completed').length,
    failed: messages.filter((m) => m.status === 'failed').length,
    pending: messages.filter((m) => m.status === 'pending').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Batch Testing')}</DialogTitle>
          <DialogDescription>
            {t('Send multiple test messages and track results for each message')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Input Section */}
          <div className="border-b pb-4 space-y-3">
            <div className="flex gap-2">
              <Select
                value={selectedPlatform}
                onValueChange={(value) => setSelectedPlatform(value as BotPlatform)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wecom">{t('WeChat Work')}</SelectItem>
                  <SelectItem value="discord">{t('Discord')}</SelectItem>
                  <SelectItem value="slack">{t('Slack')}</SelectItem>
                  <SelectItem value="telegram">{t('Telegram')}</SelectItem>
                  <SelectItem value="custom">{t('Custom')}</SelectItem>
                </SelectContent>
              </Select>

              <Textarea
                placeholder={t('Enter test message')}
                className="flex-1 min-h-[80px] resize-none"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isRunning}
              />

              <Button
                onClick={addMessage}
                disabled={isRunning || !newMessage.trim()}
                variant="outline"
                size="sm"
              >
                <RiAddLine className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('Total')}:</span>
              <Badge variant="outline">{stats.total}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('Pending')}:</span>
              <Badge variant="secondary">{stats.pending}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('Completed')}:</span>
              <Badge className="bg-green-100 text-green-800">{stats.completed}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('Failed')}:</span>
              <Badge className="bg-red-100 text-red-800">{stats.failed}</Badge>
            </div>
          </div>

          {/* Messages List */}
          <ScrollArea className="flex-1">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('No messages added yet')}
              </p>
            ) : (
              <div className="space-y-2 pr-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 border rounded-lg space-y-2 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(msg.status)}
                          <Badge variant="outline">{msg.platform}</Badge>
                          <Badge
                            variant={
                              msg.status === 'completed'
                                ? 'default'
                                : msg.status === 'failed'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-sm break-words whitespace-pre-wrap mb-1">
                          {msg.content}
                        </p>
                        {msg.result && (
                          <p className="text-xs text-muted-foreground">
                            {t('Result')}: {msg.result}
                          </p>
                        )}
                        {msg.error && (
                          <p className="text-xs text-red-600">
                            {t('Error')}: {msg.error}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMessage(msg.id)}
                        disabled={isRunning && runningId === msg.id}
                      >
                        <RiDeleteBin2Line className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t pt-4">
          <Button
            onClick={runBatch}
            disabled={messages.length === 0 || isRunning}
            className="flex-1"
          >
            {isRunning ? (
              <>
                <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
                {t('Testing...')}
              </>
            ) : (
              <>
                <RiPlayLine className="h-4 w-4 mr-1" />
                {t('Run All Tests')}
              </>
            )}
          </Button>

          <Button variant="outline" onClick={() => setMessages([])} disabled={isRunning}>
            {t('Clear All')}
          </Button>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
