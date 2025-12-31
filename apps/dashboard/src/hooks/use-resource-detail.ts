/**
 * Hook for managing resource detail state (loading, error, data, mutations)
 * Provides a consistent interface for detail pages
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { KeyedMutator } from 'swr';

export interface UseResourceDetailOptions<T> {
  resourceName: string;
  onUpdate?: (id: number | string, data: Partial<T>) => Promise<T>;
  onUpdateSuccess?: (data: T) => void;
  onUpdateError?: (error: Error) => void;
  onDelete?: (id: number | string) => Promise<void>;
  onDeleteSuccess?: () => void;
  onDeleteError?: (error: Error) => void;
}

export interface UseResourceDetailResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  updating: boolean;
  deleting: boolean;
  handleUpdate: (data: Partial<T>) => Promise<T | null>;
  handleDelete: () => Promise<void>;
  refresh: () => void;
}

export function useResourceDetail<T extends { id: number | string }>(
  data: T | undefined,
  mutate: KeyedMutator<T>,
  options: UseResourceDetailOptions<T>,
): UseResourceDetailResult<T> {
  const {
    resourceName,
    onUpdate,
    onUpdateSuccess,
    onUpdateError,
    onDelete,
    onDeleteSuccess,
    onDeleteError,
  } = options;

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = useCallback(
    async (updateData: Partial<T>): Promise<T | null> => {
      if (!data?.id || !onUpdate) return null;

      setUpdating(true);
      try {
        const updated = await onUpdate(data.id, updateData);
        await mutate();
        toast.success(`${resourceName} updated`);
        onUpdateSuccess?.(updated);
        return updated;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        toast.error(`Failed to update ${resourceName}: ${err.message}`);
        onUpdateError?.(err);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [data, resourceName, onUpdate, onUpdateSuccess, onUpdateError, mutate],
  );

  const handleDelete = useCallback(async () => {
    if (!data?.id || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(data.id);
      await mutate();
      toast.success(`${resourceName} deleted`);
      onDeleteSuccess?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(`Failed to delete ${resourceName}: ${err.message}`);
      onDeleteError?.(err);
    } finally {
      setDeleting(false);
    }
  }, [data, resourceName, onDelete, onDeleteSuccess, onDeleteError, mutate]);

  const refresh = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    data: data || null,
    loading: !data && !mutate,
    error: null, // SWR handles errors
    updating,
    deleting,
    handleUpdate,
    handleDelete,
    refresh,
  };
}
