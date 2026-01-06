'use client';

import { PageHeader } from '@/components/page-header';
import { LoadingState } from '@/components/loading-state';
import { ErrorState } from '@/components/error-state';
import { useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { Button } from '@/components/ui/button';
import { RiArrowLeftLine } from '@remixicon/react';
import { useBot } from '@/lib/api/bots-hooks';
import { BotForm } from '@/components/bots/form';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';

export default function EditBotPage() {
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
          title={t('Edit Bot')}
          description={t('Update bot configuration')}
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
        title={t('Edit Bot')}
        description={`${t('Update')} ${bot.name}`}
        action={
          <Button onClick={() => router.back()} variant="outline">
            <RiArrowLeftLine className="h-4 w-4" />
            {t('Back')}
          </Button>
        }
      />

      <div className="max-w-2xl">
        <BotForm bot={bot} isLoading={isLoading} />
      </div>
    </div>
  );
}
