import type { useTranslations } from '@/i18n/use-translations';

type TranslateFn = ReturnType<typeof useTranslations>;

export type QueryResultCountStyle = 'plain' | 'history';

export const buildQueryResultCountLabel = (
  t: TranslateFn,
  rowCount: number | null | undefined,
  style: QueryResultCountStyle = 'plain',
): string => {
  if (rowCount === null || rowCount === undefined || rowCount <= 0) {
    return t('No Data');
  }

  return style === 'history'
    ? t('Returned {count} rows', { count: rowCount })
    : t('{count} rows', { count: rowCount });
};
