import { defaultLocale, hasLocale, Locale } from './config';

const LOCALE_STORAGE_KEY = 'app-locale';

/**
 * 从 localStorage 获取保存的语言设置
 * 如果没有设置或无效，则返回默认语言
 */
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && hasLocale(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read locale from localStorage:', error);
  }

  return defaultLocale;
}

/**
 * 将语言设置保存到 localStorage
 */
export function setStoredLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch (error) {
    console.error('Failed to save locale to localStorage:', error);
  }
}

/**
 * 从 localStorage 清除语言设置
 */
export function clearStoredLocale(): void {
  try {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear locale from localStorage:', error);
  }
}

/**
 * 检查 localStorage 中是否有语言设置
 */
export function hasStoredLocale(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored !== null && hasLocale(stored);
  } catch {
    return false;
  }
}
