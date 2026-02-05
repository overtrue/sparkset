'use client';
import { RiMore2Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { Link } from '@/i18n/client-routing';

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
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

interface DataTableRowActionsProps {
  actions: RowAction[];
}

export function DataTableRowActions({ actions }: DataTableRowActionsProps) {
  const t = useTranslations();
  const regularActions = actions.filter((a) => a.variant !== 'destructive');
  const destructiveActions = actions.filter((a) => a.variant === 'destructive');

  const renderAction = (action: RowAction, key: string) => {
    const content = (
      <>
        {action.icon}
        {action.label}
      </>
    );
    const itemProps = {
      onClick: action.onClick,
      disabled: action.disabled,
      variant: action.variant ?? 'default',
    };

    if (action.href) {
      return (
        <DropdownMenuItem key={key} {...itemProps} asChild>
          <Link href={action.href}>{content}</Link>
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuItem key={key} {...itemProps}>
        {content}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shadow-none text-muted-foreground/40 hover:text-muted-foreground"
            aria-label={t('Actions menu')}
          >
            <RiMore2Line className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {regularActions.map((action, index) => renderAction(action, String(index)))}
        {destructiveActions.length > 0 && regularActions.length > 0 && <DropdownMenuSeparator />}
        {destructiveActions.map((action, index) => renderAction(action, `destructive-${index}`))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
