'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export const useSidebar = () => React.useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div className="flex min-h-screen w-full">{children}</div>
    </SidebarContext.Provider>
  );
}

export const Sidebar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const ctx = React.useContext(SidebarContext);
    return (
      <aside
        ref={ref}
        data-state={ctx?.open ? 'open' : 'closed'}
        className={cn(
          'sidebar fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-white/10 bg-[hsl(var(--sidebar))] transition-transform duration-200',
          ctx?.open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'lg:translate-x-0',
          className,
        )}
        {...props}
      />
    );
  },
);
Sidebar.displayName = 'Sidebar';

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) return null;
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200',
        className,
      )}
      onClick={() => ctx.setOpen(!ctx.open)}
      aria-label="Toggle sidebar"
      {...props}
    >
      {ctx.open ? '×' : '≡'}
    </button>
  );
});
SidebarTrigger.displayName = 'SidebarTrigger';

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-1 flex-col gap-6', className)} {...props} />
));
SidebarContent.displayName = 'SidebarContent';

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-4', className)} {...props} />
  ),
);
SidebarHeader.displayName = 'SidebarHeader';

export const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  ),
);
SidebarGroup.displayName = 'SidebarGroup';

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center gap-2 rounded-md px-2 py-1 text-xs uppercase tracking-[0.08em] text-slate-400',
      className,
    )}
    {...props}
  />
));
SidebarGroupLabel.displayName = 'SidebarGroupLabel';

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-1', className)} {...props} />
));
SidebarGroupContent.displayName = 'SidebarGroupContent';

export const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-1', className)} {...props} />
  ),
);
SidebarMenu.displayName = 'SidebarMenu';

export const SidebarMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('w-full', className)} {...props} />
));
SidebarMenuItem.displayName = 'SidebarMenuItem';

export const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { isActive?: boolean }
>(({ className, isActive, ...props }, ref) => (
  <a
    ref={ref}
    data-active={isActive ? 'true' : 'false'}
    className={cn(
      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
      isActive
        ? 'bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
        : 'text-slate-200 hover:bg-white/5',
      className,
    )}
    {...props}
  />
));
SidebarMenuButton.displayName = 'SidebarMenuButton';

export const SidebarRail = () => null;

export const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex min-h-screen w-full flex-col bg-slate-950 lg:pl-72', className)}
      {...props}
    />
  ),
);
SidebarInset.displayName = 'SidebarInset';
