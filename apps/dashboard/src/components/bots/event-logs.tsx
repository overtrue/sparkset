'use client';

import { useTranslations } from '@/i18n/use-translations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/loading-state';
import { formatDateTime } from '@/lib/utils/date';
import { truncate } from '@/lib/utils/format';
import type { BotEvent } from '@/types/api';

interface EventLogsProps {
  botId: number;
  events?: BotEvent[];
  isLoading?: boolean;
  error?: unknown;
}

export function EventLogs({ events = [], isLoading, error }: EventLogsProps) {
  const t = useTranslations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Events')}</CardTitle>
          <CardDescription>{t('Webhook events for this bot')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingState message={t('Loading events…')} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Events')}</CardTitle>
          <CardDescription>{t('Webhook events for this bot')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{t('Failed to load events')}</p>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Events')}</CardTitle>
          <CardDescription>{t('Webhook events for this bot')}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('No events yet')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Recent Events')}</CardTitle>
        <CardDescription>
          {t('Latest')} {events.length} {t('webhook event(s)')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-input"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {event.externalEventId}
                  </code>
                  <Badge className={getStatusColor(event.status)} variant="outline">
                    {event.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t('User')}: {event.externalUserName || event.externalUserId}
                </p>
                {event.content && (
                  <p className="text-sm break-words mb-1">{truncate(event.content, 100, '…')}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
