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
import type { DashboardWidget } from '@/types/dashboard';
import { useTranslations } from '@/i18n/use-translations';
import { useEffect, useState } from 'react';

interface EditTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget | null;
  onSave: (widgetId: number, title: string) => void;
}

export function EditTitleDialog({ open, onOpenChange, widget, onSave }: EditTitleDialogProps) {
  const t = useTranslations();
  const [title, setTitle] = useState('');
  const isOpen = open && Boolean(widget);

  useEffect(() => {
    if (!isOpen || !widget) return;
    setTitle(widget.title || '');
  }, [isOpen, widget]);

  const handleSave = () => {
    if (!widget) return;
    // 允许空标题，空标题会使用来源对象的标题
    onSave(widget.id, title.trim());
    onOpenChange(false);
  };

  if (!widget) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Edit Widget Title')}</DialogTitle>
          <DialogDescription>
            {t("Leave empty to use default title (source object's title), or enter a custom title")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="widget-title">{t('Title')}</Label>
            <Input
              id="widget-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('Leave empty to use default title')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave}>{t('Save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
