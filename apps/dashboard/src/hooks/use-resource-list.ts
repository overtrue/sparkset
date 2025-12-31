/**
 * Hook for managing resource list state (loading, error, data, mutations)
 * Provides a consistent interface for list pages
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import type { KeyedMutator } from 'swr';

export interface UseResourceListOptions<T> {
  resourceName: string;
  onDelete?: (item: T) => Promise<void>;
  onDeleteSuccess?: (item: T) => void;
  onDeleteError?: (item: T, error: Error) => void;
  onBulkDelete?: (items: T[]) => Promise<void>;
  onBulkDeleteSuccess?: (items: T[]) => void;
  onBulkDeleteError?: (items: T[], error: Error) => void;
}

export interface UseResourceListResult<T> {
  items: T[];
  handleDelete: (item: T) => Promise<void>;
  handleBulkDelete: (items: T[]) => Promise<void>;
  refresh: () => void;
}

export function useResourceList<T extends { id: number | string }>(
  data: { items: T[] } | undefined,
  mutate: KeyedMutator<{ items: T[] }>,
  options: UseResourceListOptions<T>,
): UseResourceListResult<T> {
  const {
    resourceName,
    onDelete,
    onDeleteSuccess,
    onDeleteError,
    onBulkDelete,
    onBulkDeleteSuccess,
    onBulkDeleteError,
  } = options;

  const items = data?.items || [];

  const handleDelete = useCallback(
    async (item: T) => {
      try {
        if (onDelete) {
          await onDelete(item);
        }
        await mutate();
        toast.success(`${resourceName} deleted`);
        onDeleteSuccess?.(item);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        toast.error(`Failed to delete ${resourceName}: ${err.message}`);
        onDeleteError?.(item, err);
      }
    },
    [resourceName, onDelete, onDeleteSuccess, onDeleteError, mutate],
  );

  const handleBulkDelete = useCallback(
    async (itemsToDelete: T[]) => {
      try {
        if (onBulkDelete) {
          await onBulkDelete(itemsToDelete);
        } else {
          // Fallback: delete items one by one
          for (const item of itemsToDelete) {
            if (onDelete) {
              await onDelete(item);
            }
          }
        }
        await mutate();
        toast.success(`Successfully deleted ${itemsToDelete.length} ${resourceName}(s)`);
        onBulkDeleteSuccess?.(itemsToDelete);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        toast.error(`Failed to delete ${resourceName}(s): ${err.message}`);
        onBulkDeleteError?.(itemsToDelete, err);
      }
    },
    [resourceName, onDelete, onBulkDelete, onBulkDeleteSuccess, onBulkDeleteError, mutate],
  );

  const refresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    items,
    handleDelete,
    handleBulkDelete,
    refresh,
  };
}
