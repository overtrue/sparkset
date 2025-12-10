'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

interface CollapsibleContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextProps | null>(null);

export function Collapsible({
  defaultOpen = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <CollapsibleContext.Provider value={{ open, setOpen }}>
      <div
        data-state={open ? 'open' : 'closed'}
        className={cn('space-y-2', className)}
        {...props}
      />
    </CollapsibleContext.Provider>
  );
}

export const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(CollapsibleContext);
  return (
    <button
      ref={ref}
      onClick={() => ctx?.setOpen(!ctx.open)}
      data-state={ctx?.open ? 'open' : 'closed'}
      className={cn('flex w-full items-center gap-2 text-left', className)}
      {...props}
    />
  );
});
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

export const CollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const ctx = React.useContext(CollapsibleContext);
  return (
    <div
      ref={ref}
      hidden={!ctx?.open}
      data-state={ctx?.open ? 'open' : 'closed'}
      className={cn('space-y-1', className)}
      {...props}
    />
  );
});
CollapsibleContent.displayName = 'CollapsibleContent';
