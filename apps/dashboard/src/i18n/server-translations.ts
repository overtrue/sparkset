/**
 * Type-safe translation utilities for Server Components
 * Provides a consistent interface for translations in server components
 */

import { getDictionary } from './dictionaries';
import { getLocaleFromRequest } from './server-utils';

/**
 * Get type-safe translation function for Server Components
 *
 * @example
 * ```tsx
 * import { getTranslations } from '@/i18n/server-translations';
 *
 * export default async function MyPage() {
 *   const t = await getTranslations();
 *   return <div>{t('Hello World')}</div>;
 * }
 * ```
 */
export async function getTranslations(namespace?: string) {
  const locale = await getLocaleFromRequest();
  const dict = await getDictionary(locale);

  return (key: string, values?: Record<string, unknown>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    let translation = dict[fullKey] || dict[key] || key;

    // Simple variable substitution
    if (values && typeof translation === 'string') {
      Object.entries(values).forEach(([k, v]) => {
        translation = translation.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return translation;
  };
}

/**
 * Get type-safe translation function with namespace for Server Components
 *
 * @example
 * ```tsx
 * import { getNamespaceTranslations } from '@/i18n/server-translations';
 *
 * export default async function MyPage() {
 *   const t = await getNamespaceTranslations('MyPage');
 *   return <div>{t('title')}</div>;
 * }
 * ```
 */
export async function getNamespaceTranslations(namespace: string) {
  return getTranslations(namespace);
}
