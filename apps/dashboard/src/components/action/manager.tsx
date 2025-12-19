'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  RiEditLine,
  RiLoader4Line,
  RiPlayLine,
  RiAddLine,
  RiSparkling2Line,
  RiDeleteBinLine,
  RiCloseLine,
} from '@remixicon/react';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  type ActionDTO,
  type CreateActionInput,
  type DatasourceDTO,
  type UpdateActionInput,
  createAction,
  deleteAction,
  executeAction,
  fetchDatasources,
  generateActionSQL,
  updateAction,
} from '../../lib/api';
import { ConfirmDialog } from '../confirm-dialog';
import { DataTable } from '../data-table/data-table';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { DataTableRowActions, type RowAction } from '../data-table/data-table-row-actions';
import { DatasourceSelector } from '../datasource-selector';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
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

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

interface ActionManagerProps {
  initial: ActionDTO[];
}

export default function ActionManager({ initial }: ActionManagerProps) {
  const [actions, setActions] = useState(initial);
  const [form, setForm] = useState<CreateActionInput>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<unknown>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [payloadText, setPayloadText] = useState('');
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [pendingExecuteId, setPendingExecuteId] = useState<number | null>(null);
  const [datasources, setDatasources] = useState<DatasourceDTO[]>([]);
  const [selectedDatasourceId, setSelectedDatasourceId] = useState<number | undefined>(undefined);
  const [generatingSQL, setGeneratingSQL] = useState(false);

  useEffect(() => {
    if (dialogOpen) {
      setPayloadText(getPayloadForEdit(form.payload, form.type));
      // 加载数据源列表
      void fetchDatasources().then(setDatasources);
    }
  }, [form.type, dialogOpen]);

  const canSubmit = useMemo(() => {
    if (!form.name.trim() || !form.type) return false;
    if (form.type === 'sql') {
      const payload = form.payload as { sql?: string };
      return !!payload?.sql?.trim();
    }
    return true;
  }, [form]);

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

    try {
      JSON.parse(payloadText);
    } catch {
      toast.error('Payload 格式不正确，请输入有效的 JSON');
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
          payload: form.payload,
          parameters: form.parameters,
          inputSchema: form.inputSchema,
        };
        const updated = await updateAction(updateData);
        setActions((prev) => prev.map((a) => (a.id === editingId ? updated : a)));
        toast.success('Action 更新成功');
      } else {
        const created = await createAction(form);
        setActions((prev) => [...prev, created]);
        toast.success('Action 创建成功');
      }
      handleCloseDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? '操作失败');
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
      toast.success('已删除');
      setDeleteDialogOpen(false);
      setDeletingId(null);
    } catch (err) {
      toast.error((err as Error)?.message ?? '删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async (rows: ActionDTO[]) => {
    for (const row of rows) {
      try {
        await deleteAction(row.id);
      } catch (err) {
        toast.error(`删除 ${row.name} 失败: ${(err as Error)?.message}`);
      }
    }
    setActions((prev) => prev.filter((a) => !rows.some((r) => r.id === a.id)));
    toast.success(`成功删除 ${rows.length} 个 Action`);
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
    setExecuteDialogOpen(false);
    try {
      const res = await executeAction(id, parameters);
      setExecutionResult(res);
    } catch (err) {
      setExecutionError((err as Error)?.message ?? '执行失败');
    } finally {
      setExecutingId(null);
      setPendingExecuteId(null);
    }
  };

  const getPayloadForEdit = (payload: unknown, type: string): string => {
    if (type === 'sql') {
      const sqlPayload = payload as { sql?: string };
      return JSON.stringify({ sql: sqlPayload?.sql || '' }, null, 2);
    }
    return JSON.stringify(payload, null, 2);
  };

  const handleGenerateSQL = async () => {
    if (!form.name.trim()) {
      toast.error('请先输入 Action 名称');
      return;
    }

    if (!selectedDatasourceId) {
      toast.error('请先选择数据源');
      return;
    }

    setGeneratingSQL(true);
    try {
      const result = await generateActionSQL({
        name: form.name.trim(),
        description: form.description?.trim() || '',
        datasourceId: selectedDatasourceId,
      });

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

      toast.success('SQL 生成成功');
    } catch (err) {
      // 错误已经在后端返回了适当的 HTTP 状态码，这里直接显示错误消息
      const errorMessage =
        err instanceof Error ? err.message : '生成 SQL 失败，请检查数据源配置和 Schema 信息';
      toast.error(errorMessage);
    } finally {
      setGeneratingSQL(false);
    }
  };

  const canGenerateSQL = useMemo(() => {
    return (
      form.type === 'sql' &&
      form.name.trim().length > 0 &&
      selectedDatasourceId !== undefined &&
      !generatingSQL
    );
  }, [form.type, form.name, selectedDatasourceId, generatingSQL]);

  const columns: ColumnDef<ActionDTO>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="名称" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
        size: 180,
      },
      {
        accessorKey: 'type',
        header: ({ column }) => <DataTableColumnHeader column={column} title="类型" />,
        cell: ({ row }) => (
          <Badge variant="outline" className="uppercase text-xs">
            {row.getValue('type')}
          </Badge>
        ),
        size: 100,
      },
      {
        accessorKey: 'description',
        header: ({ column }) => <DataTableColumnHeader column={column} title="描述" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('description') || '-'}</span>
        ),
        size: 200,
      },
      {
        id: 'updatedAt',
        accessorFn: (row) => row.updatedAt || row.createdAt,
        header: ({ column }) => <DataTableColumnHeader column={column} title="最近更新" />,
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
          const action = row.original;
          const isExecuting = executingId === action.id;
          const isDeleting = actionId === action.id;

          const rowActions: RowAction[] = [
            {
              label: isExecuting ? '执行中...' : '执行',
              icon: <RiPlayLine className={`h-4 w-4 ${isExecuting ? 'animate-spin' : ''}`} />,
              onClick: () => handleExecuteClick(action.id),
              disabled: isExecuting,
            },
            {
              label: '编辑',
              icon: <RiEditLine className="h-4 w-4" />,
              onClick: () => handleOpenDialog(action),
              disabled: isDeleting,
            },
            {
              label: '删除',
              icon: <RiDeleteBinLine className="h-4 w-4" />,
              onClick: () => {
                setDeletingId(action.id);
                setDeleteDialogOpen(true);
              },
              variant: 'destructive',
              disabled: isDeleting,
            },
          ];

          return <DataTableRowActions actions={rowActions} />;
        },
        size: 60,
      },
    ],
    [executingId, actionId],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={actions}
        searchKey="name"
        searchPlaceholder="搜索 Action..."
        enableRowSelection
        onDeleteSelected={handleDeleteSelected}
        deleteConfirmTitle="删除 Action"
        deleteConfirmDescription={(count) =>
          `确定要删除选中的 ${count} 个 Action 吗？此操作不可撤销。`
        }
        emptyMessage="暂无 Action，点击右上角新建"
        toolbar={
          <Button onClick={() => handleOpenDialog()}>
            <RiAddLine className="h-4 w-4" />
            新建 Action
          </Button>
        }
      />

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑 Action' : '新建 Action'}</DialogTitle>
            <DialogDescription>
              {editingId ? '修改 Action 信息' : '填写以下信息以创建新的 Action'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              {/* 左侧：基本信息 */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">名称 *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={onChange('name')}
                    placeholder="如：查询用户列表"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={onChange('description')}
                    placeholder="输入 Action 描述（可选）"
                    rows={2}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">类型 *</Label>
                  <Select value={form.type} onValueChange={(value) => onChange('type')(value)}>
                    <SelectTrigger id="type">
                      <SelectValue placeholder="选择类型" />
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
                    <Label>数据源 *</Label>
                    <DatasourceSelector
                      datasources={datasources}
                      value={selectedDatasourceId}
                      onValueChange={setSelectedDatasourceId}
                      disabled={submitting || generatingSQL}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payload">
                      Payload (JSON) *
                      {form.type === 'sql' && (
                        <span className="text-xs text-muted-foreground ml-2">
                          格式: {`{"sql": "SELECT * FROM table"}`}
                        </span>
                      )}
                    </Label>
                    {form.type === 'sql' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateSQL}
                        disabled={!canGenerateSQL}
                        className="h-7 text-xs"
                      >
                        {generatingSQL ? (
                          <>
                            <RiLoader4Line className="mr-2 h-3 w-3 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <RiSparkling2Line className="mr-2 h-3 w-3" />
                            AI 生成
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    id="payload"
                    value={payloadText}
                    onChange={(e) => handlePayloadChange(e.target.value)}
                    placeholder={
                      form.type === 'sql' ? '{"sql": "SELECT * FROM table"}' : '{"key": "value"}'
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
                取消
              </Button>
              <Button type="submit" disabled={submitting || !canSubmit}>
                {submitting ? '保存中...' : editingId ? '更新' : '创建'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="确认删除"
        description="确定要删除该 Action 吗？此操作不可撤销。"
        confirmText="删除"
        cancelText="取消"
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

      {/* 执行结果 */}
      {(executionResult || executionError) && (
        <Card className="shadow-none mt-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>执行结果</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setExecutionResult(null);
                  setExecutionError(null);
                }}
              >
                <RiCloseLine className="mr-2 h-4 w-4" />
                清除
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {executionError ? (
              <Alert variant="destructive">
                <AlertDescription>{executionError}</AlertDescription>
              </Alert>
            ) : (
              <ActionResult
                actionType={
                  actions.find(
                    (a) => a.id === (executionResult as ActionExecutionResponse).actionId,
                  )?.type || 'unknown'
                }
                result={executionResult as ActionExecutionResponse}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
