/**
 * Hook for managing confirm dialog state
 */

import { useState, useCallback } from 'react';

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState | null>(null);

  const openDialog = useCallback((options: ConfirmDialogOptions) => {
    setState({
      open: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'default',
      onConfirm:
        options.onConfirm ||
        (() => {
          // No-op default handler
        }),
      onCancel:
        options.onCancel ||
        (() => {
          // No-op default handler
        }),
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state?.onConfirm) {
      await state.onConfirm();
    }
    closeDialog();
  }, [state, closeDialog]);

  const handleCancel = useCallback(() => {
    if (state?.onCancel) {
      state.onCancel();
    }
    closeDialog();
  }, [state, closeDialog]);

  return {
    dialogState: state,
    openDialog,
    closeDialog,
    handleConfirm,
    handleCancel,
  };
}
