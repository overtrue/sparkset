'use client';

import { useTranslations } from '@/i18n/use-translations';

export default function Loading() {
  const t = useTranslations();
  return <div className="p-6 text-foreground">{t('Loading') || 'Loading'}</div>;
}
