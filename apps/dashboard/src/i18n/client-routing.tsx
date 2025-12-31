'use client';

import NextLink from 'next/link';
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';
import { ComponentProps, useEffect, useState } from 'react';

import { defaultLocale, hasLocale, type Locale } from './config';
import { getStoredLocale, setStoredLocale } from './locale-storage';

/**
 * 获取当前语言（从 localStorage）
 */
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = getStoredLocale();
    setLocale(stored);
  }, []);

  return locale;
}

/**
 * 设置语言（更新 localStorage）
 */
export function useSetLocale() {
  const router = useNextRouter();

  return (locale: Locale) => {
    setStoredLocale(locale);
    // 刷新页面以应用新语言
    router.refresh();
  };
}

/**
 * 获取清理了语言前缀的路径名
 * 例如：/zh-CN/charts → /charts
 */
export function usePathname(): string {
  const pathname = useNextPathname();

  // 移除任何语言前缀
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (hasLocale(firstSegment)) {
    return '/' + segments.slice(1).join('/');
  }

  return pathname;
}

/**
 * 路由钩子 - 移除了语言处理逻辑
 * 所有路径都是干净的，不包含语言前缀
 */
export function useRouter() {
  const router = useNextRouter();

  return {
    ...router,
    push: (href: string) => {
      // 直接使用提供的路径，不添加语言前缀
      return router.push(href);
    },
    replace: (href: string) => {
      // 直接使用提供的路径，不添加语言前缀
      return router.replace(href);
    },
    back: () => {
      router.back();
    },
    forward: () => {
      router.forward();
    },
    refresh: () => {
      router.refresh();
    },
  };
}

interface LinkProps extends ComponentProps<typeof NextLink> {
  href: string;
}

/**
 * 链接组件 - 不再需要添加语言前缀
 */
export function Link({ href, ...props }: LinkProps) {
  // 直接使用提供的 href，不添加语言前缀
  return <NextLink {...props} href={href} />;
}
