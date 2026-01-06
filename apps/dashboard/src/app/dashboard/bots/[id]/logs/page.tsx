'use client';

import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { useBot, useBotEvents } from '@/lib/api/bots-hooks';
import { useTranslations } from '@/i18n/use-translations';
import { LogsTable } from '@/components/bots/logs-table';
import { RiArrowLeftLine } from '@remixicon/react';

export default function BotLogsPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const botId = useMemo(() => (params?.id ? Number(params.id) : null), [params?.id]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const { data: bot, error, isLoading } = useBot(botId);
  const {
    data: logsData,
    isLoading: logsLoading,
    error: logsError,
    mutate,
  } = useBotEvents(botId, currentPage, pageSize);

  const handleRefresh = () => {
    mutate();
  };

  const handleExport = () => {
    if (!logsData?.items) return;

    const csv = [
      ['Time', 'Event ID', 'User', 'Content', 'Status', 'Error Message', 'Processing Time'].join(
        ',',
      ),
      ...logsData.items.map((event) =>
        [
          new Date(event.createdAt).toISOString(),
          event.externalEventId,
          event.externalUserName || event.externalUserId,
          (event.content || '').replace(/"/g, '""'),
          event.status,
          (event.errorMessage || '').replace(/"/g, '""'),
          event.processingTimeMs || '',
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-logs-${botId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Loading...')}
          description={t('Fetching bot logs')}
          action={
            <Button onClick={() => router.back()} variant="outline" disabled>
              <RiArrowLeftLine className="h-4 w-4" />
              {t('Back')}
            </Button>
          }
        />
        <LoadingState message={t('Loading...')} />
      </div>
    );
  }

  if (error || !bot) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Bot Logs')}
          description={t('View all webhook events')}
          action={
            <Button onClick={() => router.back()} variant="outline">
              <RiArrowLeftLine className="h-4 w-4" />
              {t('Back')}
            </Button>
          }
        />
        <ErrorState error={error} onRetry={() => router.refresh()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${bot.name} - ${t('Logs')}`}
        description={t('View all webhook events and interactions for this bot')}
        action={
          <Button onClick={() => router.back()} variant="outline">
            <RiArrowLeftLine className="h-4 w-4" />
            {t('Back')}
          </Button>
        }
      />

      <LogsTable
        events={logsData?.items || []}
        isLoading={logsLoading}
        error={logsError}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      {/* Pagination */}
      {logsData && logsData.pagination && logsData.pagination.total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('Page')} {currentPage} {t('of')} {logsData.pagination.lastPage} (
            {logsData.pagination.total} {t('total')})
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="outline"
            >
              {t('Previous')}
            </Button>
            <Button
              onClick={() => {
                if (logsData?.pagination) {
                  setCurrentPage(Math.min(logsData.pagination.lastPage, currentPage + 1));
                }
              }}
              disabled={!logsData?.pagination || currentPage >= logsData.pagination.lastPage}
              variant="outline"
            >
              {t('Next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
