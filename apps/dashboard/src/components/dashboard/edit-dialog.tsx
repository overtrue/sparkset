'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DashboardWidget, TextWidgetConfig } from '@/types/dashboard';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget | null;
  onSave: (widgetId: number, content: string) => void;
}

export function EditDialog({ open, onOpenChange, widget, onSave }: EditDialogProps) {
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
          <DialogTitle>编辑文本 Widget</DialogTitle>
          <DialogDescription>编辑文本内容，支持 Markdown 格式</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>内容（支持 Markdown）</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入文本内容，支持 Markdown 格式"
              rows={15}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
