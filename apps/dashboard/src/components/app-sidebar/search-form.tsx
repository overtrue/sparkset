'use client';

import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export function SearchForm({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200',
        className,
      )}
    >
      <Search className="h-4 w-4 text-slate-400" />
      <input
        className="h-full w-full bg-transparent outline-none placeholder:text-slate-500"
        placeholder="搜索 (装饰占位)"
        disabled
      />
    </div>
  );
}
