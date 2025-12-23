import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sparkset Dashboard',
  description: 'AI 运营助手',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html suppressHydrationWarning>
    <body>{children}</body>
  </html>
);

export default RootLayout;
