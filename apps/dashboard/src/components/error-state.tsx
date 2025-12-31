/**
 * Unified error state component
 */

import { RiAlertLine, RiRefreshLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorStateProps {
  /**
   * Error object or error message
   */
  error: Error | string | null;
  /**
   * Title for the error (default: "Error")
   */
  title?: string;
  /**
   * Callback when retry is clicked
   */
  onRetry?: () => void;
  /**
   * Retry button text (default: "Retry")
   */
  retryText?: string;
  /**
   * Custom className
   */
  className?: string;
}

export function ErrorState({
  error,
  title,
  onRetry,
  retryText = 'Retry',
  className = '',
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error || 'An error occurred';
  const errorTitle = title || 'Error';

  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <Alert variant="destructive" className="max-w-md">
        <RiAlertLine className="h-4 w-4" />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          <RiRefreshLine className="h-4 w-4 mr-2" />
          {retryText}
        </Button>
      )}
    </div>
  );
}
