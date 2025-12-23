import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations();
  return <div className="p-6 text-foreground">{t('Loading')}</div>;
}
