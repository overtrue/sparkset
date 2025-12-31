import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocaleFromRequest } from '@/i18n/server-utils';
import { TranslationsProvider } from '@/i18n/translations-context';

export const metadata: Metadata = {
  title: 'Sparkset Dashboard',
  description: 'AI Operations Assistant',
};

interface Props {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: Props) {
  // Get locale from request (cookies/headers)
  const locale = await getLocaleFromRequest();

  // Load dictionary for the locale
  const dictionary = await getDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <TranslationsProvider translations={dictionary}>
          <ThemeProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </ThemeProvider>
        </TranslationsProvider>
      </body>
    </html>
  );
}
