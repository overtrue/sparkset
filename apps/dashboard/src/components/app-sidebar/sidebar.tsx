'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';
import { mainNav, secondaryNav, type NavItem } from './nav';
import { Menu } from 'lucide-react';

const SidebarLink = ({ item, active }: { item: NavItem; active: boolean }) => (
  <Link
    href={item.url}
    className={cn(
      'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
      active
        ? 'bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]'
        : 'text-slate-200 hover:bg-white/5',
    )}
  >
    <item.icon className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-white" />
    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
      <span className="truncate">{item.title}</span>
      {item.label ? (
        <span className="rounded-md border border-white/10 bg-white/5 px-1.5 text-[10px] uppercase tracking-wide text-slate-300 group-hover:border-white/20 group-hover:text-white">
          {item.label}
        </span>
      ) : null}
    </div>
  </Link>
);

export function AppSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const renderLinks = (items: NavItem[]) =>
    items.map((item) => <SidebarLink key={item.url} item={item} active={pathname === item.url} />);

  return (
    <>
      <button
        className="lg:hidden fixed top-3 left-3 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          'sidebar fixed inset-y-0 left-0 z-30 w-72 p-6 flex flex-col border-r border-white/10 bg-[hsl(var(--sidebar))] transition-transform duration-200',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex flex-1 flex-col gap-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">Sparkline</div>
              <p className="text-xs text-slate-400">AI 运营助手</p>
            </div>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase text-slate-200">
              Beta
            </span>
          </div>

          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">主导航</div>
            <div className="space-y-1">{renderLinks(mainNav)}</div>
          </div>

          <div className="space-y-4">
            <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500">快速操作</div>
            <div className="space-y-1">{renderLinks(secondaryNav)}</div>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium text-sm">工作区</span>
              <span className="text-slate-400">默认</span>
            </div>
            <p className="text-slate-400 leading-relaxed">将常用查询保存为模板，团队共享复用。</p>
            <Link
              href="/templates"
              className="inline-flex h-8 items-center justify-center rounded-md bg-white text-slate-900 px-3 text-[12px] font-medium hover:bg-slate-100"
            >
              查看模板
            </Link>
          </div>
          <div className="text-xs text-slate-500">v0.1.0 · 实验版</div>
        </div>
      </aside>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
