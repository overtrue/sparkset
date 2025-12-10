import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';
import { AppSidebar } from '../components/app-sidebar/sidebar';

export const metadata: Metadata = {
  title: 'Sparkline Dashboard',
  description: 'AI 运营助手管理台',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="zh-Hans">
    <body className="bg-slate-950 text-slate-50">
      <div className="flex min-h-screen w-full bg-slate-950">
        <AppSidebar />
        <main className="flex-1 lg:pl-72">
          <div className="px-5 pt-14 pb-10 sm:px-10 lg:pt-10 space-y-6 bg-slate-950">
            {children}
          </div>
        </main>
      </div>
    </body>
  </html>
);

export default RootLayout;
