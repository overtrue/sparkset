'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const nav = [
  { href: '/', label: '数据源' },
  { href: '/query', label: '查询工作台' },
  { href: '/templates', label: '模板' },
  { href: '/conversations', label: '对话记录' },
];

export default function SidebarNav() {
  const pathname = usePathname();
  return (
    <aside className="sidebar w-64 p-6 hidden sm:flex flex-col justify-between">
      <div className="space-y-6">
        <div>
          <div className="text-lg font-semibold tracking-tight">Sparkline</div>
          <p className="text-xs text-slate-400 mt-1">AI 运营助手</p>
        </div>
        <nav className="space-y-1 text-sm text-slate-200/80">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors',
                  active && 'bg-white/8 text-white',
                )}
              >
                <span>{item.label}</span>
                {active && <span className="text-xs text-brand-300">●</span>}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="text-xs text-slate-500">v0.1.0 · 实验版</div>
    </aside>
  );
}
