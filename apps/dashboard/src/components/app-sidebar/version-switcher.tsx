'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  versions: string[];
  defaultVersion?: string;
}

export function VersionSwitcher({ versions, defaultVersion }: Props) {
  const current = defaultVersion ?? versions[0];
  return (
    <button
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-200',
      )}
      type="button"
      disabled
      title="版本切换（占位）"
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="font-medium">{current}</span>
      </div>
      <ChevronDown className="h-4 w-4 text-slate-400" />
    </button>
  );
}
