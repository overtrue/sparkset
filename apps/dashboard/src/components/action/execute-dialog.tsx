'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { type ActionInputSchema } from '../../lib/api';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ExecuteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputSchema: ActionInputSchema;
  onExecute: (parameters: Record<string, unknown>) => void;
  executing?: boolean;
}

export function ExecuteDialog({
  open,
  onOpenChange,
  inputSchema,
  onExecute,
  executing = false,
}: ExecuteDialogProps) {
  const t = useTranslations();
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    inputSchema.parameters.forEach((param) => {
      if (param.default !== undefined) {
        initial[param.name] = param.default;
      } else if (param.type === 'number') {
        initial[param.name] = '';
      } else if (param.type === 'boolean') {
        initial[param.name] = false;
      } else {
        initial[param.name] = '';
      }
    });
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    inputSchema.parameters.forEach((param) => {
      const value = formData[param.name];
      if (param.required) {
        if (value === undefined || value === null || value === '') {
          newErrors[param.name] = t('{field} is required', { field: param.label || param.name });
        }
      }
      if (param.type === 'number' && value !== '' && value !== undefined && value !== null) {
        const numValue = Number(value);
        if (Number.isNaN(numValue)) {
          newErrors[param.name] = t('{field} must be a number', {
            field: param.label || param.name,
          });
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 转换数据类型
    const parameters: Record<string, unknown> = {};
    inputSchema.parameters.forEach((param) => {
      const value = formData[param.name];
      if (value === '' || value === undefined || value === null) {
        if (param.default !== undefined) {
          parameters[param.name] = param.default;
        }
        return;
      }

      if (param.type === 'number') {
        parameters[param.name] = Number(value);
      } else if (param.type === 'boolean') {
        parameters[param.name] = Boolean(value);
      } else {
        parameters[param.name] = String(value);
      }
    });

    onExecute(parameters);
  };

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // 清除该字段的错误
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // 重置表单
      const initial: Record<string, unknown> = {};
      inputSchema.parameters.forEach((param) => {
        if (param.default !== undefined) {
          initial[param.name] = param.default;
        } else if (param.type === 'number') {
          initial[param.name] = '';
        } else if (param.type === 'boolean') {
          initial[param.name] = false;
        } else {
          initial[param.name] = '';
        }
      });
      setFormData(initial);
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('Execute Action')}</DialogTitle>
            <DialogDescription>{t('Fill in the parameters to execute Action')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {inputSchema.parameters.map((param) => (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>
                  {param.label || param.name}
                  {param.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {param.description && (
                  <p className="text-xs text-muted-foreground">{param.description}</p>
                )}

                {param.type === 'boolean' ? (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={param.name}
                      checked={Boolean(formData[param.name])}
                      onCheckedChange={(checked) => handleChange(param.name, checked)}
                      disabled={executing}
                    />
                    <label
                      htmlFor={param.name}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {formData[param.name] ? t('Yes') : t('No')}
                    </label>
                  </div>
                ) : param.type === 'number' ? (
                  <Input
                    id={param.name}
                    type="number"
                    value={formData[param.name] === '' ? '' : String(formData[param.name])}
                    onChange={(e) => handleChange(param.name, e.target.value)}
                    placeholder={param.default !== undefined ? String(param.default) : undefined}
                    disabled={executing}
                  />
                ) : (
                  <Input
                    id={param.name}
                    type="text"
                    value={String(formData[param.name] || '')}
                    onChange={(e) => handleChange(param.name, e.target.value)}
                    placeholder={param.default !== undefined ? String(param.default) : undefined}
                    disabled={executing}
                  />
                )}

                {errors[param.name] && (
                  <p className="text-xs text-destructive">{errors[param.name]}</p>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={executing}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={executing}>
              {executing ? t('Executing') : t('Execute')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
