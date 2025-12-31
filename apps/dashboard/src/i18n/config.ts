export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '中文',
};

/**
 * Check if a value is a valid locale
 */
export function hasLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
