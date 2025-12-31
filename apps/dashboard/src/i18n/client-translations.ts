/**
 * Type-safe translation utilities for Client Components
 * Provides a consistent interface for translations in client components
 */

import { useTranslations as useNextIntlTranslations } from 'next-intl';

/**
 * Type-safe translation hook for Client Components
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useTranslations } from '@/i18n/client-translations';
 *
 * export function MyComponent() {
 *   const t = useTranslations();
 *   return <div>{t('Hello World')}</div>;
 * }
 * ```
 */
export function useTranslations(namespace?: string) {
  const t = useNextIntlTranslations(namespace);

  return (key: string, values?: Record<string, unknown>) => {
    return t(key, values);
  };
}

/**
 * Type-safe translation hook with namespace
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useNamespaceTranslations } from '@/i18n/client-translations';
 *
 * export function MyComponent() {
 *   const t = useNamespaceTranslations('MyComponent');
 *   return <div>{t('title')}</div>;
 * }
 * ```
 */
export function useNamespaceTranslations(namespace: string) {
  return useTranslations(namespace);
}
