'use client';

import { RiTranslate2 } from '@remixicon/react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { localeNames, type Locale } from '@/i18n/config';
import { useLocale, useSetLocale } from '@/i18n/client-routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const setLocale = useSetLocale();

  const switchLocale = (newLocale: Locale) => {
    // Update locale in localStorage
    setLocale(newLocale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <RiTranslate2 className="h-4 w-4" />
          <span className="sr-only">Switch language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(['en', 'zh-CN'] as Locale[]).map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => switchLocale(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
