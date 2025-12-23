'use client';

import { useTranslations } from 'next-intl';

export default function ErrorBoundary({ error }: { error: Error }) {
  const t = useTranslations();
  console.error(error);
  return (
    <div className="p-6 text-destructive">
      {t('Error loading query page')}
      {t('Please check API service')}
    </div>
  );
}
