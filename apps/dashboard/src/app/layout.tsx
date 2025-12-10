import type { Metadata } from 'next';
import type React from 'react';
import './globals.css';
import { AppSidebar } from '../components/app-sidebar/sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { Separator } from '../components/ui/separator';

export const metadata: Metadata = {
  title: 'Sparkline Dashboard',
  description: 'AI 运营助手管理台',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="zh-Hans">
    <body className="bg-slate-950 text-slate-50">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b border-white/10 bg-slate-950/95 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1 lg:hidden" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="text-sm text-slate-300">Sparkline Dashboard</div>
          </header>
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </body>
  </html>
);

export default RootLayout;
