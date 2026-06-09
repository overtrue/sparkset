import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { getDictionary } from '@/i18n/dictionaries';
import { getLocaleFromRequest } from '@/i18n/server-utils';
import { TranslationsProvider } from '@/i18n/translations-context';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Sparkset Dashboard',
  description: 'AI Operations Assistant',
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Crect width=%2232%22 height=%2232%22 rx=%228%22 fill=%22%230f172a%22/%3E%3Cpath d=%22M8 18h7v6H8zM17 8h7v16h-7zM8 8h7v8H8z%22 fill=%22%23f8fafc%22/%3E%3C/svg%3E',
        type: 'image/svg+xml',
      },
    ],
  },
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
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
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
