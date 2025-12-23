'use client';

import { RiComputerLine, RiMoonLine, RiSunFoggyLine } from '@remixicon/react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const t = useTranslations();

  // 避免 SSR 不匹配问题
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <RiSunFoggyLine className="h-4 w-4" />
      </Button>
    );
  }

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <RiSunFoggyLine className="h-4 w-4" />;
      case 'dark':
        return <RiMoonLine className="h-4 w-4" />;
      default:
        return <RiComputerLine className="h-4 w-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          {getIcon()}
          <span className="sr-only">{t('Toggle Theme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme || 'system'} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <RiSunFoggyLine className="mr-2 h-4 w-4" />
            <span>{t('Light')}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <RiMoonLine className="mr-2 h-4 w-4" />
            <span>{t('Dark')}</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <RiComputerLine className="mr-2 h-4 w-4" />
            <span>{t('System')}</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
