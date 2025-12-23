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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DashboardWidget, TextWidgetConfig } from '@/types/dashboard';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget | null;
  onSave: (widgetId: number, content: string) => void;
}

export function EditDialog({ open, onOpenChange, widget, onSave }: EditDialogProps) {
  const t = useTranslations();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (widget && widget.type === 'text') {
      const config = widget.config as TextWidgetConfig;
      setContent(config.content);
    }
  }, [widget]);

  const handleSave = () => {
    if (!widget) return;
    if (!content.trim()) {
      return;
    }
    onSave(widget.id, content.trim());
    onOpenChange(false);
  };

  if (!widget || widget.type !== 'text') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Edit Text Widget')}</DialogTitle>
          <DialogDescription>{t('Edit text content, Markdown format supported')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('Content (Markdown supported)')}</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('Enter text content, Markdown format supported')}
              rows={15}
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
