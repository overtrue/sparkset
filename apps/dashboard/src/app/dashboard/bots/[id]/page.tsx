'use client';

import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/client-routing';
import { useBot } from '@/lib/api/bots-hooks';
import { useTranslations } from '@/i18n/use-translations';
import { formatDateTime } from '@/lib/utils/date';
import { RiArrowLeftLine, RiEdit2Line } from '@remixicon/react';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

const PLATFORM_LABELS: Record<string, string> = {
  wecom: 'WeChat Work',
  discord: 'Discord',
  slack: 'Slack',
  telegram: 'Telegram',
};

export default function BotDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const botId = useMemo(() => (params?.id ? Number(params.id) : null), [params?.id]);

  const { data: bot, error, isLoading } = useBot(botId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('Loading...')}
          description={t('Fetching bot details')}
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
          title={t('Bot Details')}
          description={t('View bot configuration')}
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
        title={bot.name}
        description={bot.description || t('No description')}
        action={
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/dashboard/bots/${bot.id}/edit`)} variant="outline">
              <RiEdit2Line className="h-4 w-4" />
              {t('Edit')}
            </Button>
            <Button onClick={() => router.back()} variant="outline">
              <RiArrowLeftLine className="h-4 w-4" />
              {t('Back')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Basic Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('Platform')}</p>
              <Badge variant="outline" className="mt-1">
                {PLATFORM_LABELS[bot.platform] || bot.platform}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{t('Query')}</p>
              <div className="mt-1">
                {bot.enableQuery ? (
                  <Badge variant="secondary">{t('Enabled')}</Badge>
                ) : (
                  <Badge variant="outline">{t('Disabled')}</Badge>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{t('Created')}</p>
              <p className="text-sm mt-1">{formatDateTime(bot.createdAt)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">{t('Updated')}</p>
              <p className="text-sm mt-1">{formatDateTime(bot.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Enabled Actions')}</CardTitle>
            <CardDescription>
              {bot.enabledActions?.length || 0} {t('action(s) enabled')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bot.enabledActions && bot.enabledActions.length > 0 ? (
              <div className="space-y-2">
                {bot.enabledActions.map((actionId) => (
                  <div
                    key={actionId}
                    className="flex items-center justify-between p-2 rounded bg-muted"
                  >
                    <span className="text-sm">Action ID: {actionId}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('No actions enabled')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Logs and Events */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">{t('Events')}</TabsTrigger>
          <TabsTrigger value="logs">{t('Logs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Recent Events')}</CardTitle>
              <CardDescription>{t('Webhook events for this bot')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('Events view coming soon')}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Audit Logs')}</CardTitle>
              <CardDescription>{t('History of changes to this bot')}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('Logs view coming soon')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
