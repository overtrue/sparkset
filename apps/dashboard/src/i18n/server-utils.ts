import { cookies, headers } from 'next/headers';
import { defaultLocale, hasLocale, type Locale } from './config';

const LOCALE_COOKIE_KEY = 'app-locale';

/**
 * 从请求中获取语言设置
 * 优先级：Cookie > Accept-Language > 默认语言
 */
export async function getLocaleFromRequest(): Promise<Locale> {
  try {
    // 1. 检查 cookie
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get(LOCALE_COOKIE_KEY)?.value;

    if (localeCookie && hasLocale(localeCookie)) {
      return localeCookie;
    }

    // 2. 从 Accept-Language 推断
    const headerStore = await headers();
    const acceptLanguage = headerStore.get('accept-language');
    if (acceptLanguage) {
      const languages = acceptLanguage.split(',').map((lang) => {
        const [code, q = '1'] = lang.split(';');
        return {
          code: code.trim(),
          quality: parseFloat(q.replace('q=', '')),
        };
      });

      languages.sort((a, b) => b.quality - a.quality);

      for (const lang of languages) {
        if (hasLocale(lang.code)) {
          return lang.code;
        }
        if (lang.code === 'zh') {
          return 'zh-CN';
        }
        if (lang.code === 'en') {
          return 'en';
        }
      }
    }

    return defaultLocale;
  } catch (error) {
    console.warn('Failed to get locale from request:', error);
    return defaultLocale;
  }
}
