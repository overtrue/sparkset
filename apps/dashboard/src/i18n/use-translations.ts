'use client';

import * as React from 'react';
import { useTranslationsContext } from './translations-context';

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() ?? match;
  });
}

export function useTranslations() {
  const translations = useTranslationsContext();

  return React.useCallback(
    (key: string, values?: Record<string, string | number>): string => {
      const translation = translations[key];
      if (!translation) {
        // 开发环境下警告缺失的翻译
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Translation missing for key: "${key}"`);
        }
        return key;
      }

      if (values) {
        return interpolate(translation, values);
      }

      return translation;
    },
    [translations],
  );
}
