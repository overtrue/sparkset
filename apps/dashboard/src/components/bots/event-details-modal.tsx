'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import { RiClipboardLine, RiCheckLine, RiRefreshLine } from '@remixicon/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { BotEvent } from '@/types/api';
import { replayBotEvent } from '@/lib/api/bots-api';

interface EventDetailsModalProps {
  event: BotEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  botId?: number;
  onReplaySuccess?: () => void;
}

export function EventDetailsModal({
  event,
  open,
  onOpenChange,
  botId,
  onReplaySuccess,
}: EventDetailsModalProps) {
  const t = useTranslations();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);

  if (!event) return null;

  const copyToClipboard = (value: string, fieldName: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(fieldName);
    toast.success(t('Copied to clipboard'));
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleReplay = async () => {
    if (!botId) {
      toast.error(t('Bot ID is required'));
      return;
    }

    setReplaying(true);
    try {
      await replayBotEvent(botId, event.id);
      toast.success(t('Event replayed successfully'));
      onReplaySuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Failed to replay event'));
    } finally {
      setReplaying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const fields = [
    { label: 'Event ID', value: event.id.toString() },
    { label: 'External Event ID', value: event.externalEventId },
    { label: 'User ID', value: event.externalUserId },
    { label: 'User Name', value: event.externalUserName || '—' },
    { label: 'Status', value: event.status, isBadge: true },
    { label: 'Created At', value: formatDateTime(event.createdAt) },
    { label: 'Updated At', value: formatDateTime(event.updatedAt) },
    ...(event.processingTimeMs !== undefined
      ? [{ label: 'Processing Time (ms)', value: event.processingTimeMs.toString() }]
      : []),
    ...(event.retryCount !== undefined
      ? [{ label: 'Retry Count', value: event.retryCount.toString() }]
      : []),
    ...(event.errorMessage ? [{ label: 'Error Message', value: event.errorMessage }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Event Details')}</DialogTitle>
          <DialogDescription>
            {t('View detailed information about this webhook event')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Basic Fields */}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-3 rounded-lg border border-input"
                >
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {t(field.label)}
                    </p>
                    {field.isBadge ? (
                      <Badge className={getStatusColor(field.value)} variant="outline">
                        {field.value}
                      </Badge>
                    ) : (
                      <p className="text-sm break-words font-mono text-foreground">{field.value}</p>
                    )}
                  </div>
                  {!field.isBadge && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(field.value, field.label)}
                      className="shrink-0 mt-6"
                    >
                      {copiedField === field.label ? (
                        <RiCheckLine className="h-4 w-4" />
                      ) : (
                        <RiClipboardLine className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Content */}
            {event.content && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{t('Message Content')}</h3>
                <div className="p-3 rounded-lg border border-input bg-muted/50 max-h-40 overflow-auto">
                  <p className="text-sm break-words whitespace-pre-wrap">{event.content}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(event.content, 'Content')}
                  className="w-full"
                >
                  <RiClipboardLine className="h-4 w-4 mr-1" />
                  {t('Copy Content')}
                </Button>
              </div>
            )}

            {/* Action Result */}
            {event.actionResult && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{t('Action Result')}</h3>
                <div className="p-3 rounded-lg border border-input bg-muted/50 max-h-40 overflow-auto">
                  <pre className="text-xs break-words whitespace-pre-wrap">
                    {JSON.stringify(event.actionResult, null, 2)}
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(event.actionResult, null, 2), 'Result')
                  }
                  className="w-full"
                >
                  <RiClipboardLine className="h-4 w-4 mr-1" />
                  {t('Copy Result')}
                </Button>
              </div>
            )}

            {/* Platform Details */}
            {event.platformDetails && Object.keys(event.platformDetails).length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm">{t('Platform Details')}</h3>
                <div className="p-3 rounded-lg border border-input bg-muted/50 max-h-40 overflow-auto">
                  <pre className="text-xs break-words whitespace-pre-wrap">
                    {JSON.stringify(event.platformDetails, null, 2)}
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(JSON.stringify(event.platformDetails, null, 2), 'Details')
                  }
                  className="w-full"
                >
                  <RiClipboardLine className="h-4 w-4 mr-1" />
                  {t('Copy Details')}
                </Button>
              </div>
            )}

            {/* Raw JSON */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm">{t('Raw JSON')}</h3>
              <div className="p-3 rounded-lg border border-input bg-muted/50 max-h-40 overflow-auto">
                <pre className="text-xs break-words whitespace-pre-wrap">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(event, null, 2), 'Raw')}
                className="w-full"
              >
                <RiClipboardLine className="h-4 w-4 mr-1" />
                {t('Copy Raw JSON')}
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Close')}
          </Button>
          {botId && (
            <Button
              onClick={() => {
                void handleReplay();
              }}
              disabled={replaying}
              className="gap-2"
            >
              <RiRefreshLine className={`h-4 w-4 ${replaying ? 'animate-spin' : ''}`} />
              {replaying ? t('Replaying') : t('Replay Event')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
