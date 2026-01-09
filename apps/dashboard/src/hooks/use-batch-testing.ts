import { useState, useCallback } from 'react';
import { testBot } from '@/lib/api/bots-api';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import type { BotPlatform } from '@/types/api';

export interface BatchTestMessage {
  id: string;
  content: string;
  platform?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

interface UseBatchTestingOptions {
  onSuccess?: () => void;
  onError?: () => void;
}

interface BatchTestResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useBatchTesting(
  botId: number,
  initialPlatform: BotPlatform,
  options?: UseBatchTestingOptions,
) {
  const t = useTranslations();
  const [messages, setMessages] = useState<BatchTestMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  const addMessage = useCallback((content: string, platform: BotPlatform) => {
    if (!content.trim()) return false;

    const id = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id,
        content,
        platform,
        status: 'pending',
      },
    ]);
    return true;
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const updateMessageStatus = useCallback((id: string, updates: Partial<BatchTestMessage>) => {
    setMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)));
  }, []);

  const executeTest = async (message: BatchTestMessage): Promise<BatchTestResult> => {
    try {
      const result = await testBot(botId, message.content, message.platform as BotPlatform);
      return {
        success: result.success,
        message: result.message,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const runBatch = useCallback(async () => {
    const pendingMessages = messages.filter((msg) => msg.status === 'pending');
    if (pendingMessages.length === 0) {
      toast.error(t('No pending messages to test'));
      return;
    }

    setIsRunning(true);

    // Process each message sequentially but update state efficiently
    for (const msg of pendingMessages) {
      setRunningId(msg.id);

      // Update to running status
      updateMessageStatus(msg.id, { status: 'running' });

      // Execute the test
      const result = await executeTest(msg);

      // Update with final status in a single operation
      updateMessageStatus(msg.id, {
        status: result.success ? 'completed' : 'failed',
        result: result.message,
        error: result.error,
      });
    }

    setRunningId(null);
    setIsRunning(false);
    toast.success(t('Batch testing completed'));
    options?.onSuccess?.();
  }, [messages, botId, updateMessageStatus, options, t]);

  const stats = {
    total: messages.length,
    completed: messages.filter((m) => m.status === 'completed').length,
    failed: messages.filter((m) => m.status === 'failed').length,
    pending: messages.filter((m) => m.status === 'pending').length,
  };

  return {
    messages,
    isRunning,
    runningId,
    stats,
    addMessage,
    removeMessage,
    clearMessages,
    runBatch,
  };
}
