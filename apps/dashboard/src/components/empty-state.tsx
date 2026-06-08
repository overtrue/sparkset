'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/client-routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon?: ReactNode;
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Action button
   */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: 'default' | 'outline' | 'secondary';
  };
  /**
   * Custom className
   */
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-20 text-center', className)}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-6 max-w-md">{description}</p>}
      {action && (
        <Button
          type="button"
          onClick={action.onClick}
          variant={action.variant || 'default'}
          asChild={Boolean(action.href)}
        >
          {action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
        </Button>
      )}
    </div>
  );
}
