'use client';

import { useTranslations } from '@/i18n/use-translations';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /**
   * Loading message to display
   */
  message?: string;
  /**
   * Use skeleton loader instead of spinner
   */
  useSkeleton?: boolean;
  /**
   * Number of skeleton items to show
   */
  skeletonCount?: number;
  /**
   * Custom className
   */
  className?: string;
}

export function LoadingState({
  message,
  useSkeleton = false,
  skeletonCount = 3,
  className = '',
}: LoadingStateProps) {
  const t = useTranslations();
  const displayMessage = message || t('Loading…');

  if (useSkeleton) {
    return (
      <div
        className={cn('space-y-4', className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label={displayMessage}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" aria-hidden="true" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col items-center justify-center py-12', className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Spinner className="h-8 w-8 mb-4" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{displayMessage}</p>
    </div>
  );
}
