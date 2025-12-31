/**
 * Unified loading state component
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

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
  if (useSkeleton) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Spinner className="h-8 w-8 mb-4" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
