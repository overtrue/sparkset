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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DashboardWidget } from '@/types/dashboard';

interface EditTitleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: DashboardWidget | null;
  onSave: (widgetId: number, title: string) => void;
}

export function EditTitleDialog({ open, onOpenChange, widget, onSave }: EditTitleDialogProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (widget) {
      // 初始化标题，如果为空则使用空字符串
      setTitle(widget.title || '');
    }
  }, [widget]);

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
          <DialogTitle>编辑 Widget 标题</DialogTitle>
          <DialogDescription>
            留空则使用默认标题（来源对象的标题），或手动输入自定义标题
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="留空则使用默认标题"
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
