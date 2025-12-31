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
  RiStarLine,
} from '@remixicon/react';
import { ColumnDef } from '@tanstack/react-table';
import { useTranslations } from '@/i18n/use-translations';
import { type ChangeEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AI_PROVIDER_TYPES, getProviderLabel } from '../../lib/aiProviderTypes';
import {
  createAIProvider,
  deleteAIProvider,
  setDefaultAIProvider,
  testAIProviderConnectionByConfig,
  updateAIProvider,
} from '../../lib/api/ai-providers-api';
import type { AIProviderDTO, CreateAIProviderInput, TestConnectionResult } from '@/types/api';
const removeAIProvider = deleteAIProvider;
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
  const t = useTranslations();
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
        toast.success(t('Connection verified successfully'));
      } else {
        setIsVerified(false);
      }
    } catch (err) {
      const errorMsg = (err as Error)?.message ?? t('Connection verification failed');
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
        toast.success(t('Provider updated successfully'));
      } else {
        const created = await createAIProvider(form);
        setProviders((prev) => [...prev, created]);
        toast.success(t('Provider created successfully'));
      }
      handleCloseDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Operation failed'));
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
      toast.success(t('Default Provider set successfully'));
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Setting failed'));
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
      toast.success(t('Deleted'));
      setConfirmOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Delete failed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async (rows: AIProviderDTO[]) => {
    for (const row of rows) {
      try {
        await removeAIProvider(row.id);
      } catch (err) {
        toast.error(`${t('Delete failed')}: ${row.name} - ${(err as Error)?.message}`);
      }
    }
    setProviders((prev) => prev.filter((p) => !rows.some((r) => r.id === p.id)));
    toast.success(t('Successfully deleted {count} provider(s)', { count: rows.length }));
  };

  const columns: ColumnDef<AIProviderDTO>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
        size: 180,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Type')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{getProviderLabel(row.getValue('type'))}</span>
        ),
        size: 140,
      },
      {
        accessorKey: 'defaultModel',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t('Default Model')} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('defaultModel') || '-'}</span>
        ),
        size: 140,
      },
      {
        accessorKey: 'isDefault',
        header: t('Status'),
        cell: ({ row }) =>
          row.getValue('isDefault') ? (
            <Badge variant="default" className="gap-1">
              <RiStarLine className="h-3 w-3 fill-current" />
              {t('Default')}
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <RiCheckLine className="h-3 w-3" />
              {t('Configured')}
            </Badge>
          ),
        size: 100,
      },
      {
        accessorKey: 'updatedAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('Updated At')} />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.getValue('updatedAt'))}</span>
        ),
        size: 180,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('Actions')}</span>,
        cell: ({ row }) => {
          const provider = row.original;
          const isLoading = actionId === provider.id;

          const actions: RowAction[] = [];

          if (!provider.isDefault) {
            actions.push({
              label: t('Set as Default'),
              icon: <RiStarLine className="h-4 w-4" />,
              onClick: () => {
                void handleSetDefault(provider.id);
              },
              disabled: isLoading,
            });
          }

          actions.push(
            {
              label: t('Edit'),
              icon: <RiEdit2Line className="h-4 w-4" />,
              onClick: () => handleOpenDialog(provider),
              disabled: isLoading,
            },
            {
              label: t('Delete'),
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
        searchPlaceholder={t('Search Provider')}
        enableRowSelection
        onDeleteSelected={(rows) => {
          void handleDeleteSelected(rows);
        }}
        deleteConfirmTitle={t('Delete Provider')}
        deleteConfirmDescription={(count) =>
          t(
            'Are you sure to delete the selected {count} provider(s)? This action cannot be undone',
            { count },
          )
        }
        emptyMessage={t('No providers yet, click the button above to add')}
        toolbar={
          <Button onClick={() => handleOpenDialog()}>
            <RiAddLine className="h-4 w-4" />
            {t('Add Provider')}
          </Button>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? t('Edit Provider') : t('Add Provider')}</DialogTitle>
            <DialogDescription>
              {editingId
                ? t(
                    'Modify provider configuration, verify connection after modification is recommended',
                  )
                : t('Fill in the information below and verify the connection to create a provider')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('Name')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={onChange('name')}
                  placeholder={t('e.g. my-openai')}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">{t('Provider Type')}</Label>
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
                        <span className="text-muted-foreground">{t('Select Provider Type')}</span>
                      )}
                      <RiArrowDownSLine className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command className="h-[350px]">
                      <CommandInput placeholder={t('Search Provider')} />
                      <CommandList>
                        <CommandEmpty>{t('No matching Provider found')}</CommandEmpty>
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
                  {editingId && (
                    <span className="text-muted-foreground">
                      {t('(Leave empty to keep unchanged)')}
                    </span>
                  )}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={form.apiKey}
                  onChange={onChange('apiKey')}
                  placeholder={editingId ? t('Leave empty to keep unchanged') : 'sk-...'}
                  required={!editingId}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseURL">{t('Base URL (optional)')}</Label>
                <Input
                  id="baseURL"
                  value={form.baseURL}
                  onChange={onChange('baseURL')}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="defaultModel">{t('Default Model (optional)')}</Label>
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
                        <span className="text-blue-600">{t('Verifying Provider connection')}</span>
                      </>
                    )}
                    {testResult?.success && !testing && (
                      <>
                        <RiCheckboxCircleLine className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">
                          {t('Connection verified successfully')}
                        </span>
                      </>
                    )}
                    {testResult?.success === false && !testing && (
                      <>
                        <RiCloseCircleLine className="h-4 w-4 text-red-500" />
                        <span className="text-red-600">{t('Connection verification failed')}</span>
                      </>
                    )}
                  </div>
                  {testResult?.message && (
                    <p className="text-sm text-muted-foreground">{testResult.message}</p>
                  )}
                  {editingId && testResult?.success === false && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('Tip: Please check the API Key, Base URL and Provider type configuration')}
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
                      onClick={() => {
                        void handleTestConnection();
                      }}
                      disabled={!canTest || testing}
                      className="w-full sm:w-auto"
                    >
                      {testing ? t('Verifying') : t('Verify Connection')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      {t('Cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    {/* 验证通过后：显示确认按钮 */}
                    <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                      {submitting
                        ? editingId
                          ? t('Updating')
                          : t('Creating')
                        : editingId
                          ? t('Save')
                          : t('Add')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="w-full sm:w-auto"
                    >
                      {t('Cancel')}
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
        title={t('Delete Provider')}
        description={t('Are you sure to delete this Provider? This action cannot be undone')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </>
  );
}
