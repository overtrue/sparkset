import { BellIcon } from '@radix-ui/react-icons';
import type { Metadata } from 'next';
import type React from 'react';
import { AppSidebar } from '../components/app-sidebar';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import { Toaster } from '../components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sparkline Dashboard',
  description: 'AI 运营助手',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="zh-Hans" className="dark">
    <body>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="overflow-hidden px-4 md:px-6 lg:px-8">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b">
            <div className="flex flex-1 items-center gap-2 px-3">
              <SidebarTrigger className="-ml-4" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="text-sm text-muted-foreground">Sparkline Dashboard</div>
            </div>
            <div className="flex gap-3 ml-auto">
              <Button variant="ghost" size="icon">
                <BellIcon className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 lg:gap-6 py-4 lg:py-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </body>
  </html>
);

export default RootLayout;
