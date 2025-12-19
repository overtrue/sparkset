'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createAction, type CreateActionInput } from '@/lib/api';
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
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('名称不能为空');
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
      toast.success('Action 保存成功');
      onSuccess?.();
      onOpenChange(false);
      // 重置表单
      setName(defaultName);
      setDescription('');
    } catch (err) {
      const errorMessage = (err as Error)?.message ?? '保存失败';
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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>保存查询为 Action</DialogTitle>
            <DialogDescription>
              将当前查询保存为可复用的 Action，后续可以在 Actions 页面管理和执行。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-name">名称 *</Label>
              <Input
                id="action-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入 Action 名称"
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-description">描述</Label>
              <Textarea
                id="action-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入 Action 描述（可选）"
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
              取消
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
