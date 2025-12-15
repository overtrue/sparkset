'use client';

import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface RowAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface DataTableRowActionsProps {
  actions: RowAction[];
}

export function DataTableRowActions({ actions }: DataTableRowActionsProps) {
  const regularActions = actions.filter((a) => a.variant !== 'destructive');
  const destructiveActions = actions.filter((a) => a.variant === 'destructive');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shadow-none text-muted-foreground/40 hover:text-muted-foreground"
            aria-label="操作菜单"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {regularActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className="gap-2"
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
        {destructiveActions.length > 0 && regularActions.length > 0 && <DropdownMenuSeparator />}
        {destructiveActions.map((action, index) => (
          <DropdownMenuItem
            key={`destructive-${index}`}
            onClick={action.onClick}
            disabled={action.disabled}
            className="gap-2 text-destructive focus:text-destructive"
          >
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
