'use client';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBin2Line,
  RiEdit2Line,
  RiLoader4Line,
  RiRefreshLine,
  RiStarLine,
} from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { type ChangeEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AI_PROVIDER_TYPES, getProviderLabel } from '../../lib/aiProviderTypes';
import {
  type AIProviderDTO,
  type CreateAIProviderInput,
  createAIProvider,
  removeAIProvider,
  setDefaultAIProvider,
  testAIProviderConnectionByConfig,
  type TestConnectionResult,
  updateAIProvider,
} from '../../lib/api';
import { ConfirmDialog } from '../confirm-dialog';
import { DataTable } from '../data-table/data-table';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { DataTableRowActions, type RowAction } from '../data-table/data-table-row-actions';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 连通性验证相关的状态
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  // 验证通过状态（单独管理，不依赖表单变化自动清除）
  const [isVerified, setIsVerified] = useState(false);

  const canTest = useMemo(() => {
    // 测试需要类型和 API Key（部分 provider 需要）
    if (!form.type) return false;
    // 对于需要 API Key 的 provider，必须有 API Key 才能测试
    if (
      ['openai', 'anthropic', 'deepseek', 'groq', 'moonshot', 'zhipu', 'qwen'].includes(form.type)
    ) {
      return !!form.apiKey;
    }
    // openai-compatible 需要 baseURL
    if (form.type === 'openai-compatible') {
      return !!form.baseURL;
    }
    return true;
  }, [form]);

  const shouldShowSubmit = useMemo(() => {
    // 必须验证通过，且所有基础字段完整
    return isVerified && form.name && form.type;
  }, [isVerified, form]);

  const onChange =
    (key: keyof CreateAIProviderInput) => (e: ChangeEvent<HTMLInputElement> | string) => {
      const value = typeof e === 'string' ? e : e.target.value;
      setForm((prev: CreateAIProviderInput) => ({
        ...prev,
        [key]: value,
      }));

      // 用户修改配置时，重置验证状态
      setIsVerified(false);
      setTestResult(null);
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
    // 重置验证状态
    setTestResult(null);
    setTesting(false);
    setIsVerified(false);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    setTestResult(null);
    setTesting(false);
    setIsVerified(false);
  };

  const handleTestConnection = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!canTest || testing) return;
    setTesting(true);
    try {
      const testConfig = {
        type: form.type,
        apiKey: form.apiKey,
        baseURL: form.baseURL,
        defaultModel: form.defaultModel,
      };
      const result = await testAIProviderConnectionByConfig(testConfig);

      setTestResult(result);
      if (result.success) {
        setIsVerified(true);
        toast.success('连通性验证通过');
      } else {
        setIsVerified(false);
      }
    } catch (err) {
      const errorMsg = (err as Error)?.message ?? '连通性验证失败';
      setTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!shouldShowSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (editingId) {
        const updateData = { ...form };
        if (!updateData.apiKey) {
          delete (updateData as Partial<CreateAIProviderInput>).apiKey;
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

  const handleRemoveClick = (id: number) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await removeAIProvider(deletingId);
      setProviders((prev) => prev.filter((p) => p.id !== deletingId));
      toast.success('已删除');
      setConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? '删除失败');
    } finally {
      setDeleting(false);
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
              <RiStarLine className="h-3 w-3 fill-current" />
              默认
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <RiCheckLine className="h-3 w-3" />
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
              icon: <RiStarLine className="h-4 w-4" />,
              onClick: () => handleSetDefault(provider.id),
              disabled: isLoading,
            });
          }

          actions.push(
            {
              label: '编辑',
              icon: <RiEdit2Line className="h-4 w-4" />,
              onClick: () => handleOpenDialog(provider),
              disabled: isLoading,
            },
            {
              label: '删除',
              icon: <RiDeleteBin2Line className="h-4 w-4" />,
              onClick: () => handleRemoveClick(provider.id),
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
            <RiAddLine className="h-4 w-4" />
            添加 Provider
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑 Provider' : '添加 Provider'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? '修改 Provider 配置信息，修改后建议重新验证连接'
                : '填写以下信息并验证连接后，即可创建 Provider'}
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
                        <span className="text-sm font-medium">{getProviderLabel(form.type)}</span>
                      ) : (
                        <span className="text-muted-foreground">选择 Provider 类型</span>
                      )}
                      <RiArrowDownSLine className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command className="h-[350px]">
                      <CommandInput placeholder="搜索 Provider..." />
                      <CommandList>
                        <CommandEmpty>未找到匹配的 Provider</CommandEmpty>
                        <CommandGroup>
                          {AI_PROVIDER_TYPES.map((providerType) => (
                            <CommandItem
                              key={providerType.value}
                              value={`${providerType.value} ${providerType.label}`}
                              onSelect={() => {
                                onChange('type')(providerType.value);
                                setProviderSelectOpen(false);
                              }}
                              className="py-2"
                            >
                              <span className="text-sm font-medium">{providerType.label}</span>
                              {form.type === providerType.value && (
                                <RiCheckLine className="ml-auto h-4 w-4 shrink-0" />
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

              {/* 连通性验证状态区域 */}
              {(testResult !== null || testing) && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/50">
                  <div className="flex items-center gap-2 font-medium">
                    {testing && (
                      <>
                        <RiLoader4Line className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="text-blue-600">正在验证 Provider 连接...</span>
                      </>
                    )}
                    {testResult?.success && !testing && (
                      <>
                        <RiCheckboxCircleLine className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">连接验证成功</span>
                      </>
                    )}
                    {testResult?.success === false && !testing && (
                      <>
                        <RiCloseCircleLine className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">连接验证失败</span>
                      </>
                    )}
                  </div>
                  {testResult?.message && (
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  )}
                  {editingId && testResult?.success === false && (
                    <p className="text-xs text-muted-foreground mt-2">
                      提示：请检查 API Key、Base URL 和 Provider 类型配置
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 sm:flex-col-reverse sm:gap-0">
              <div className="flex gap-2 sm:flex-row-reverse">
                {!shouldShowSubmit ? (
                  <>
                    {/* 创建/编辑模式：只显示验证连通性按钮 */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={!canTest || testing}
                      className="w-full sm:w-auto"
                    >
                      {testing ? '验证中...' : '验证连通性'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      取消
                    </Button>
                  </>
                ) : (
                  <>
                    {/* 验证通过后：显示确认按钮 */}
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting
                        ? editingId
                          ? '更新中...'
                          : '创建中...'
                        : editingId
                          ? '保存'
                          : '添加'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      取消
                    </Button>
                  </>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="删除 Provider"
        description="确定要删除该 Provider 吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}
