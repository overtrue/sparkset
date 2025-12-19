import { RiLoader4Line } from '@remixicon/react';
import { cn } from '@/lib/utils';

function Spinner({ className }: { className?: string }) {
  return <RiLoader4Line className={cn('size-4 animate-spin', className)} />;
}

export { Spinner };
