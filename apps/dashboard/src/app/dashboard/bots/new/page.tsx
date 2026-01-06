'use client';

import { PageHeader } from '@/components/page-header';
import { useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { Button } from '@/components/ui/button';
import { RiArrowLeftLine } from '@remixicon/react';
import { BotForm } from '@/components/bots/form';

export default function NewBotPage() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Create Bot')}
        description={t('Create a new AI bot')}
        action={
          <Button onClick={() => router.back()} variant="outline">
            <RiArrowLeftLine className="h-4 w-4" />
            {t('Back')}
          </Button>
        }
      />

      <div className="max-w-2xl">
        <BotForm />
      </div>
    </div>
  );
}
