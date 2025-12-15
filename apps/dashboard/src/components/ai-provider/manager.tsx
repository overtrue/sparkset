'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Check, ChevronDown, Edit, Plus, Star, Trash2 } from 'lucide-react';
import { type ChangeEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AI_PROVIDER_TYPES, getProviderLabel } from '../../lib/aiProviderTypes';
import {
  type AIProviderDTO,
  type CreateAIProviderInput,
  createAIProvider,
  removeAIProvider,
  setDefaultAIProvider,
  updateAIProvider,
} from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { DataTable } from '../ui/data-table';
import { DataTableColumnHeader } from '../ui/data-table-column-header';
import { DataTableRowActions, type RowAction } from '../ui/data-table-row-actions';
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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

const defaultForm: CreateAIProviderInput = {
  name: '',
  type: 'openai',
  apiKey: '',
  baseURL: '',
  defaultModel: '',
  isDefault: false,
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

interface AIProviderManagerProps {
  initial: AIProviderDTO[];
}

export default function AIProviderManager({ initial }: AIProviderManagerProps) {
  const [providers, setProviders] = useState(initial);
  const [form, setForm] = useState<CreateAIProviderInput>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [providerSelectOpen, setProviderSelectOpen] = useState(false);

  const canSubmit = useMemo(() => {
    if (editingId) {
      return form.name && form.type;
    }
    return form.name && form.type && form.apiKey;
  }, [form, editingId]);

  const onChange =
    (key: keyof CreateAIProviderInput) => (e: ChangeEvent<HTMLInputElement> | string) => {
      const value = typeof e === 'string' ? e : e.target.value;
      setForm((prev: CreateAIProviderInput) => ({
        ...prev,
        [key]: value,
      }));
    };

  const handleOpenDialog = (provider?: AIProviderDTO) => {
    if (provider) {
      setEditingId(provider.id);
      setForm({
        name: provider.name,
        type: provider.type,
        apiKey: '',
        baseURL: provider.baseURL ?? '',
        defaultModel: provider.defaultModel ?? '',
        isDefault: provider.isDefault,
      });
    } else {
      setEditingId(null);
      setForm(defaultForm);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (editingId) {
        const updateData = { ...form };
        if (!updateData.apiKey) {
          delete updateData.apiKey;
        }
        const updated = await updateAIProvider(editingId, updateData);
        setProviders((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success('Provider 更新成功');
      } else {
        const created = await createAIProvider(form);
        setProviders((prev) => [...prev, created]);
        toast.success('Provider 创建成功');
      }
      handleCloseDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setActionId(id);
    try {
      await setDefaultAIProvider(id);
      setProviders((prev) =>
        prev.map((p) => ({
          ...p,
          isDefault: p.id === id,
        })),
      );
      toast.success('默认 Provider 设置成功');
    } catch (err) {
      toast.error((err as Error)?.message ?? '设置失败');
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (id: number) => {
    setActionId(id);
    try {
      await removeAIProvider(id);
      setProviders((prev) => prev.filter((p) => p.id !== id));
      toast.success('已删除');
    } catch (err) {
      toast.error((err as Error)?.message ?? '删除失败');
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteSelected = async (rows: AIProviderDTO[]) => {
    for (const row of rows) {
      try {
        await removeAIProvider(row.id);
      } catch (err) {
        toast.error(`删除 ${row.name} 失败: ${(err as Error)?.message}`);
      }
    }
    setProviders((prev) => prev.filter((p) => !rows.some((r) => r.id === p.id)));
    toast.success(`成功删除 ${rows.length} 个 Provider`);
  };

  const columns: ColumnDef<AIProviderDTO>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
        size: 160,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {getProviderLabel(row.getValue('type'))}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'defaultModel',
        header: ({ column }) => <DataTableColumnHeader column={column} title="默认模型" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.getValue('defaultModel') || '-'}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'isDefault',
        header: '状态',
        cell: ({ row }) =>
          row.getValue('isDefault') ? (
            <Badge variant="default" className="gap-1">
              <Star className="h-3 w-3 fill-current" />
              默认
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Check className="h-3 w-3" />
              已配置
            </Badge>
          ),
        size: 100,
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="更新时间" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDate(row.getValue('updatedAt'))}
          </span>
        ),
        size: 160,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">操作</span>,
        cell: ({ row }) => {
          const provider = row.original;
          const isLoading = actionId === provider.id;

          const actions: RowAction[] = [];

          if (!provider.isDefault) {
            actions.push({
              label: '设为默认',
              icon: <Star className="h-4 w-4" />,
              onClick: () => handleSetDefault(provider.id),
              disabled: isLoading,
            });
          }

          actions.push(
            {
              label: '编辑',
              icon: <Edit className="h-4 w-4" />,
              onClick: () => handleOpenDialog(provider),
              disabled: isLoading,
            },
            {
              label: '删除',
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => handleRemove(provider.id),
              variant: 'destructive',
              disabled: isLoading,
            },
          );

          return <DataTableRowActions actions={actions} />;
        },
        size: 60,
      },
    ],
    [actionId],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={providers}
        searchKey="name"
        searchPlaceholder="搜索 Provider..."
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle="删除 Provider"
        deleteConfirmDescription={(count) =>
          `确定要删除选中的 ${count} 个 Provider 吗？此操作不可撤销。`
        }
        emptyMessage="暂无 Provider，点击右上角添加"
        toolbar={
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            添加 Provider
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改 Provider 配置信息' : '填写以下信息以配置新的 AI Provider'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">名称</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={onChange('name')}
                  placeholder="如 my-openai"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Provider 类型</Label>
                <Popover open={providerSelectOpen} onOpenChange={setProviderSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={providerSelectOpen}
                      className="h-auto min-h-9 w-full justify-between py-2 px-3 text-left font-normal"
                      id="type"
                    >
                      {form.type ? (
                        <div className="flex flex-col items-start gap-0.5 text-left w-full flex-1">
                          <span className="text-sm font-medium leading-tight">
                            {getProviderLabel(form.type)}
                          </span>
                          {AI_PROVIDER_TYPES.find((p) => p.value === form.type)?.description && (
                            <span className="text-xs text-muted-foreground leading-tight">
                              {AI_PROVIDER_TYPES.find((p) => p.value === form.type)?.description}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">选择 Provider 类型</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索 Provider..." />
                      <CommandList>
                        <CommandEmpty>未找到匹配的 Provider</CommandEmpty>
                        <CommandGroup>
                          {AI_PROVIDER_TYPES.map((providerType) => (
                            <CommandItem
                              key={providerType.value}
                              value={`${providerType.value} ${providerType.label} ${providerType.description || ''}`}
                              onSelect={() => {
                                onChange('type')(providerType.value);
                                setProviderSelectOpen(false);
                              }}
                              className="py-2.5"
                            >
                              <div className="flex flex-col items-start gap-0.5 w-full flex-1">
                                <span className="text-sm font-medium leading-tight">
                                  {providerType.label}
                                </span>
                                {providerType.description && (
                                  <span className="text-xs text-muted-foreground leading-tight">
                                    {providerType.description}
                                  </span>
                                )}
                              </div>
                              {form.type === providerType.value && (
                                <Check className="ml-auto h-4 w-4 shrink-0" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">
                  API Key{' '}
                  {editingId && <span className="text-muted-foreground">(留空则不修改)</span>}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={form.apiKey}
                  onChange={onChange('apiKey')}
                  placeholder={editingId ? '留空则不修改' : 'sk-...'}
                  required={!editingId}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseURL">Base URL (可选)</Label>
                <Input
                  id="baseURL"
                  value={form.baseURL}
                  onChange={onChange('baseURL')}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultModel">默认模型 (可选)</Label>
                <Input
                  id="defaultModel"
                  value={form.defaultModel}
                  onChange={onChange('defaultModel')}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? '提交中...' : editingId ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
