'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createAction } from '@/lib/api/actions-api';
import type { CreateActionInput } from '@/types/api';
import { useTranslations } from '@/i18n/use-translations';
import { useState } from 'react';
import { toast } from 'sonner';

interface SaveActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  datasourceId?: number;
  defaultName?: string;
  onSuccess?: () => void;
}

export function SaveActionDialog({
  open,
  onOpenChange,
  sql,
  datasourceId,
  defaultName = '',
  onSuccess,
}: SaveActionDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('Name cannot be empty'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: CreateActionInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'sql',
        payload: {
          sql,
          ...(datasourceId && { datasourceId }),
        },
      };

      await createAction(payload);
      toast.success(t('Action saved successfully'));
      onSuccess?.();
      onOpenChange(false);
      // 重置表单
      setName(defaultName);
      setDescription('');
    } catch (err) {
      const errorMessage = (err as Error)?.message ?? t('Save failed');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 关闭时重置表单和错误
      setName(defaultName);
      setDescription('');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('Save query as Action')}</DialogTitle>
            <DialogDescription>{t('Save current query as reusable Action')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-name">{t('Name')} *</Label>
              <Input
                id="action-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('Enter Action name')}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-description">{t('Description')}</Label>
              <Textarea
                id="action-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('Enter Action description (optional)')}
                disabled={saving}
                rows={3}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={saving}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t('Saving') : t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
