'use client';

import { RiAlertLine, RiRefreshLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ApiError } from '@/lib/fetch';
import { cn } from '@/lib/utils';

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

export function ErrorState({ error, title, onRetry, retryText, className = '' }: ErrorStateProps) {
  const t = useTranslations();
  const isApiError = error instanceof ApiError;
  let errorMessage = error instanceof Error ? error.message : error || t('An error occurred');
  let errorTitle = title || t('Error');

  if (isApiError && error.status === 403) {
    errorTitle = title || t('Insufficient permissions');
    errorMessage = t('You do not have permission to access this page');
  }

  if (isApiError && error.status === 401) {
    errorTitle = title || t('Session expired');
    errorMessage = t('Please sign in again');
  }

  const displayRetryText = retryText || t('Retry');

  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Alert variant="destructive" className="max-w-md" role="alert" aria-live="assertive">
        <RiAlertLine className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
      {onRetry && (
        <Button type="button" onClick={onRetry} variant="outline" className="mt-4">
          <RiRefreshLine className="h-4 w-4" aria-hidden="true" />
          {displayRetryText}
        </Button>
      )}
    </div>
  );
}
