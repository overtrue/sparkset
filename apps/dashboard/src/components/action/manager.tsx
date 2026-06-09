'use client';

import { RiAddLine, RiLoader4Line, RiSparkling2Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { type ChangeEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createAction,
  deleteAction,
  executeAction,
  fetchActions,
  generateActionSQL,
  updateAction,
} from '../../lib/api/actions-api';
import { fetchDatasources } from '../../lib/api/datasources-api';
import type {
  ActionCapabilities,
  ActionDTO,
  CreateActionInput,
  GenerateActionSQLInput,
  UpdateActionInput,
} from '@/types/api';
import type { Datasource } from '@/types/api';
import { createActionColumns } from './columns';
import { ConfirmDialog } from '../confirm-dialog';
import { DataTable } from '../data-table/data-table';
import { DatasourceSelector } from '../datasource-selector';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { ExecuteDialog } from './execute-dialog';
import { ParameterEditor } from './parameter-editor';
import { ActionResult } from './result';
import type { ActionExecutionResponse } from './types';

const defaultForm: CreateActionInput = {
  name: '',
  description: '',
  type: 'sql',
  payload: { sql: '' },
  parameters: undefined,
  inputSchema: undefined,
};

function getPayloadForEdit(payload: unknown, type: string): string {
  if (type === 'sql') {
    const sqlPayload = payload as { sql?: string };
    return JSON.stringify({ sql: sqlPayload?.sql || '' }, null, 2);
  }
  return JSON.stringify(payload, null, 2);
}

interface ActionManagerProps {
  initial: ActionDTO[];
  capabilities: ActionCapabilities;
}

export default function ActionManager({ initial, capabilities }: ActionManagerProps) {
  const t = useTranslations();
  const [actions, setActions] = useState(initial);
  const [currentCapabilities, setCurrentCapabilities] = useState(capabilities);
  const [form, setForm] = useState<CreateActionInput>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<unknown>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [payloadText, setPayloadText] = useState('');
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [pendingExecuteId, setPendingExecuteId] = useState<number | null>(null);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | undefined>(undefined);
  const [generatingSQL, setGeneratingSQL] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchActions()
      .then((result) => {
        if (!active) return;
        setActions(result.items ?? []);
        setCurrentCapabilities(result.capabilities ?? capabilities);
      })
      .catch(() => {
        if (!active) return;
        setActions(initial);
        setCurrentCapabilities(capabilities);
      });

    return () => {
      active = false;
    };
  }, [capabilities, initial]);

  useEffect(() => {
    if (!dialogOpen) return;
    setPayloadText(getPayloadForEdit(form.payload, form.type));
  }, [dialogOpen, form.type]);

  useEffect(() => {
    if (!dialogOpen) return;
    // 加载数据源列表
    void fetchDatasources().then((res) => setDatasources(res.items));
  }, [dialogOpen]);

  const sqlPayload =
    form.type === 'sql' && typeof form.payload === 'object' && form.payload !== null
      ? (form.payload as { sql?: string })
      : null;
  const selectedDatasource = datasources.find(
    (datasource) => datasource.id === selectedDatasourceId,
  );
  const canManageSelectedDatasource = Boolean(selectedDatasource?.capabilities?.canManage);
  const canQuerySelectedDatasource = Boolean(selectedDatasource?.capabilities?.canQuery);
  const hasRequiredManagePermission =
    form.type === 'sql' ? canManageSelectedDatasource : currentCapabilities.canManage;
  const canSubmit =
    form.name.trim().length > 0 &&
    Boolean(form.type) &&
    hasRequiredManagePermission &&
    (form.type !== 'sql' ||
      (Boolean(sqlPayload?.sql?.trim()) && selectedDatasourceId !== undefined));

  const onChange =
    (key: keyof CreateActionInput) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
      const value = typeof e === 'string' ? e : e.target.value;
      setForm((prev: CreateActionInput) => ({
        ...prev,
        [key]: value,
      }));
    };

  const handlePayloadChange = (value: string) => {
    setPayloadText(value);
    try {
      const parsed = JSON.parse(value);
      setForm((prev: CreateActionInput) => ({
        ...prev,
        payload: parsed,
      }));
    } catch {
      // JSON 解析失败时，保持 payloadText 状态，提交时会验证
    }
  };

  const handleOpenDialog = (action?: ActionDTO) => {
    if (action && !action.capabilities?.canManage) return;
    if (action) {
      setEditingId(action.id);
      setForm({
        name: action.name,
        description: action.description || '',
        type: action.type,
        payload: action.payload,
        parameters: action.parameters,
        inputSchema: action.inputSchema || undefined,
      });
      setPayloadText(getPayloadForEdit(action.payload, action.type));
      // 从 payload 中提取 datasourceId（如果是 SQL 类型）
      if (action.type === 'sql') {
        const sqlPayload = action.payload as { sql?: string; datasourceId?: number };
        setSelectedDatasourceId(sqlPayload?.datasourceId);
      } else {
        setSelectedDatasourceId(undefined);
      }
    } else {
      setEditingId(null);
      setForm(defaultForm);
      setPayloadText(getPayloadForEdit(defaultForm.payload, defaultForm.type));
      setSelectedDatasourceId(undefined);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
    setPayloadText(getPayloadForEdit(defaultForm.payload, defaultForm.type));
    setSelectedDatasourceId(undefined);
    setGeneratingSQL(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;

    let payload: unknown;
    try {
      const parsedPayload = JSON.parse(payloadText);
      payload =
        form.type === 'sql'
          ? {
              ...(typeof parsedPayload === 'object' && parsedPayload !== null ? parsedPayload : {}),
              datasourceId: selectedDatasourceId,
            }
          : parsedPayload;
    } catch {
      toast.error(t('Invalid Payload format, please enter valid JSON'));
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const updateData: UpdateActionInput = {
          id: editingId,
          name: form.name,
          description: form.description || undefined,
          type: form.type,
          payload,
          parameters: form.parameters,
          inputSchema: form.inputSchema,
        };
        const updated = await updateAction(updateData);
        setActions((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        toast.success(t('Action updated successfully'));
      } else {
        const created = await createAction({
          ...form,
          payload,
        });
        setActions((prev) => [...prev, created]);
        toast.success(t('Action created successfully'));
      }
      handleCloseDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Operation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteAction(deletingId);
      setActions((prev) => prev.filter((a) => a.id !== deletingId));
      toast.success(t('Deleted'));
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Delete failed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async (rows: ActionDTO[]) => {
    if (rows.length === 0) return;
    const results = await Promise.allSettled(rows.map((row) => deleteAction(row.id)));
    const failedIds = new Set<number>();

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const row = rows[index];
        failedIds.add(row.id);
        toast.error(
          t('Delete {name} failed: {message}', {
            name: row.name,
            message: (result.reason as Error)?.message,
          }),
        );
      }
    });

    const succeededIds = rows.filter((row) => !failedIds.has(row.id)).map((row) => row.id);
    if (succeededIds.length > 0) {
      const succeededSet = new Set(succeededIds);
      setActions((prev) => prev.filter((action) => !succeededSet.has(action.id)));
      toast.success(t('Successfully deleted {count} Actions', { count: succeededIds.length }));
    }
  };

  const handleExecuteClick = (id: number) => {
    const action = actions.find((a) => a.id === id);
    if (action?.inputSchema && action.inputSchema.parameters.length > 0) {
      setPendingExecuteId(id);
      setExecuteDialogOpen(true);
    } else {
      void handleExecute(id);
    }
  };

  const handleExecute = async (id: number, parameters?: Record<string, unknown>) => {
    setExecutingId(id);
    setExecutionResult(null);
    setExecutionError(null);
    setResultDialogOpen(false);
    setExecuteDialogOpen(false);
    try {
      const res = await executeAction(id, parameters);
      setExecutionResult(res);
      setResultDialogOpen(true);
    } catch (err) {
      setExecutionError((err as Error)?.message ?? t('Execution failed'));
      setResultDialogOpen(true);
    } finally {
      setExecutingId(null);
      setPendingExecuteId(null);
    }
  };

  const handleGenerateSQL = async () => {
    if (!form.name.trim()) {
      toast.error(t('Please enter Action name first'));
      return;
    }

    if (!selectedDatasourceId) {
      toast.error(t('Please select a datasource first'));
      return;
    }

    setGeneratingSQL(true);
    try {
      const result = await generateActionSQL({
        name: form.name.trim(),
        description: form.description?.trim() || '',
        datasourceId: selectedDatasourceId,
      } as GenerateActionSQLInput);

      // 更新 payload（包含 datasourceId）
      const newPayload = {
        sql: result.sql,
        ...(selectedDatasourceId && { datasourceId: selectedDatasourceId }),
      };
      setForm((prev) => ({
        ...prev,
        payload: newPayload,
        inputSchema: result.inputSchema,
      }));
      setPayloadText(JSON.stringify(newPayload, null, 2));

      toast.success(t('SQL generated successfully'));
    } catch (err) {
      // Error already returned appropriate HTTP status code from backend, display error message directly
      const errorMessage =
        err instanceof Error
          ? err.message
          : t(
              'Failed to generate SQL, please check datasource configuration and Schema information',
            );
      toast.error(errorMessage);
    } finally {
      setGeneratingSQL(false);
    }
  };

  const canGenerateSQL =
    form.type === 'sql' &&
    form.name.trim().length > 0 &&
    selectedDatasourceId !== undefined &&
    canQuerySelectedDatasource &&
    !generatingSQL;

  const columns = createActionColumns({
    t,
    executingId,
    deletingId,
    onExecute: handleExecuteClick,
    onEdit: handleOpenDialog,
    onDelete: (id) => {
      setDeletingId(id);
      setDeleteDialogOpen(true);
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={actions}
        searchKey="name"
        searchPlaceholder={t('Search actions…')}
        enableRowSelection={actions.some((action) => action.capabilities?.canManage)}
        onDeleteSelected={(rows) => {
          void handleDeleteSelected(rows);
        }}
        deleteConfirmTitle={t('Delete Action')}
        deleteConfirmDescription={(count) => t('confirmDeleteSelectedActions', { count })}
        emptyMessage={t('No Actions yet, click Create New in the top right')}
        toolbar={
          <Button onClick={() => handleOpenDialog()}>
            <RiAddLine className="h-4 w-4" aria-hidden="true" />
            {t('Create Action')}
          </Button>
        }
      />

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t('Edit Action') : t('Create Action')}</DialogTitle>
            <DialogDescription>
              {editingId
                ? t('Modify Action information')
                : t('Fill in the information to create a new Action')}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
          >
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              {/* 左侧：基本信息 */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('Name')} *</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="off"
                    value={form.name}
                    onChange={onChange('name')}
                    placeholder={t('E.g. query user list…')}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">{t('Description')}</Label>
                  <Textarea
                    id="description"
                    name="description"
                    autoComplete="off"
                    value={form.description}
                    onChange={onChange('description')}
                    placeholder={t('Describe the Action (optional)…')}
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">{t('Type')} *</Label>
                  <Select
                    name="type"
                    value={form.type}
                    onValueChange={(value) => onChange('type')(value)}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder={t('Select type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sql">SQL</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.type === 'sql' && (
                  <div className="grid gap-2">
                    <Label>{t('Datasource')} *</Label>
                    <DatasourceSelector
                      datasources={datasources}
                      value={selectedDatasourceId}
                      onValueChange={setSelectedDatasourceId}
                      disabled={submitting || generatingSQL}
                    />
                    {selectedDatasourceId !== undefined && !canManageSelectedDatasource ? (
                      <Alert>
                        <AlertDescription>
                          {t(
                            'You need datasource:manage permission to change SQL Actions for this datasource',
                          )}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                )}

                {form.type !== 'sql' && !currentCapabilities.canManage ? (
                  <Alert>
                    <AlertDescription>
                      {t('You need action:manage permission to change API or file Actions')}
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payload">
                      Payload (JSON) *
                      {form.type === 'sql' && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {t('Format')}: {`{"sql": "SELECT * FROM table"}`}
                        </span>
                      )}
                    </Label>
                    {form.type === 'sql' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void handleGenerateSQL();
                        }}
                        disabled={!canGenerateSQL}
                        className="h-7 text-xs"
                      >
                        {generatingSQL ? (
                          <>
                            <RiLoader4Line className="h-3 w-3 animate-spin" aria-hidden="true" />
                            {t('Generating…')}
                          </>
                        ) : (
                          <>
                            <RiSparkling2Line className="h-3 w-3" aria-hidden="true" />
                            {t('AI Generate')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="payload"
                    name="payload"
                    autoComplete="off"
                    value={payloadText}
                    onChange={(e) => handlePayloadChange(e.target.value)}
                    placeholder={
                      form.type === 'sql' ? '{"sql": "SELECT * FROM table"}…' : '{"key": "value"}…'
                    }
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              {/* 右侧：参数编辑器 */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <ParameterEditor
                    value={form.inputSchema}
                    onChange={(value) => setForm((prev) => ({ ...prev, inputSchema: value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? t('Saving…') : editingId ? t('Update') : t('Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('Confirm Delete')}
        description={t('confirmDeleteAction')}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />

      {/* 执行参数输入对话框 */}
      {pendingExecuteId !== null && (
        <ExecuteDialog
          open={executeDialogOpen}
          onOpenChange={setExecuteDialogOpen}
          inputSchema={
            actions.find((a) => a.id === pendingExecuteId)?.inputSchema || {
              parameters: [],
            }
          }
          onExecute={(parameters) => {
            if (pendingExecuteId !== null) {
              void handleExecute(pendingExecuteId, parameters);
            }
          }}
          executing={executingId === pendingExecuteId}
        />
      )}

      {/* 执行结果弹窗 */}
      <Dialog
        open={resultDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExecutionResult(null);
            setExecutionError(null);
          }
          setResultDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[960px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Execution Result')}</DialogTitle>
          </DialogHeader>
          {executionError ? (
            <Alert variant="destructive">
              <AlertDescription>{executionError}</AlertDescription>
            </Alert>
          ) : executionResult ? (
            <ActionResult
              actionType={
                actions.find((a) => a.id === (executionResult as ActionExecutionResponse).actionId)
                  ?.type || 'unknown'
              }
              result={executionResult as ActionExecutionResponse}
            />
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExecutionResult(null);
                setExecutionError(null);
                setResultDialogOpen(false);
              }}
            >
              {t('Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
