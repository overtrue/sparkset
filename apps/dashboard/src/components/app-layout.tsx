/**
 * AppLayout - 带侧边栏和头部的应用布局
 * 用于需要完整应用界面的页面
 */

'use client';

import { RiNotification3Line } from '@remixicon/react';
import type React from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { UserMenu } from '@/components/auth/user-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useTranslations } from '@/i18n/use-translations';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const t = useTranslations();

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {t('Skip to content')}
      </a>
      <AppSidebar />
      <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger className="-ml-4" />
            <Separator orientation="vertical" className="mr-2 h-4!" />
            <div className="text-sm text-muted-foreground">Sparkset</div>
          </div>
          <div className="flex gap-3 ml-auto">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label={t('Notifications')}>
              <RiNotification3Line className="h-4 w-4" aria-hidden="true" />
            </Button>
            <UserMenu />
          </div>
        </header>
        <main id="main-content" className="flex flex-1 flex-col gap-4 py-4 lg:gap-6 lg:py-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
