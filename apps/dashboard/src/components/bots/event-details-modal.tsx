'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n/use-translations';
import { RiRefreshLine } from '@remixicon/react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { BotEvent } from '@/types/api';
import { replayBotEvent } from '@/lib/api/bots-api';
import { CodeViewer } from '@/components/code-viewer';

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
  const [replaying, setReplaying] = useState(false);

  if (!event) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('Event Details')}</DialogTitle>
          <DialogDescription>
            {t('View detailed information about this webhook event')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <CodeViewer
            code={JSON.stringify(event, null, 2)}
            language="json"
            showLineNumbers={true}
            className="max-h-[60vh]"
          />
        </div>

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
