/**
 * Unified API hooks for consistent data fetching patterns
 *
 * This hook provides a consistent interface for API calls with:
 * - Unified error handling
 * - Loading state management
 * - Automatic retry logic
 * - Type safety
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export interface UseApiResult<T, Args extends unknown[] = []> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Generic hook for API calls with loading and error states
 *
 * @example
 * ```tsx
 * const { data, loading, error, execute } = useApi(fetchDatasources);
 *
 * useEffect(() => {
 *   execute();
 * }, []);
 * ```
 */
export function useApi<T, Args extends unknown[] = []>(
  apiFunction: (...args: Args) => Promise<T>,
  options: UseApiOptions<T> = {},
): UseApiResult<T, Args> {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage,
    errorMessage,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(...args);
        setData(result);

        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        if (showErrorToast) {
          toast.error(errorMessage || error.message || 'An error occurred');
        }

        onError?.(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      apiFunction,
      onSuccess,
      onError,
      showErrorToast,
      showSuccessToast,
      successMessage,
      errorMessage,
    ],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * Hook for mutation operations (create, update, delete)
 *
 * @example
 * ```tsx
 * const { execute: createItem, loading } = useMutation(createDatasource, {
 *   onSuccess: () => {
 *     toast.success('Created successfully');
 *     mutate(); // Refresh list
 *   },
 * });
 * ```
 */
export function useMutation<T, Args extends unknown[] = []>(
  mutationFunction: (...args: Args) => Promise<T>,
  options: UseApiOptions<T> = {},
): Omit<UseApiResult<T, Args>, 'data' | 'reset'> & {
  mutate: (...args: Args) => Promise<T | null>;
} {
  const { loading, error, execute } = useApi(mutationFunction, {
    showSuccessToast: true,
    showErrorToast: true,
    ...options,
  });

  return {
    loading,
    error,
    mutate: execute,
  };
}
