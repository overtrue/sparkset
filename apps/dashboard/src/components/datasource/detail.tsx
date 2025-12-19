'use client';

import {
  RiArrowLeftLine,
  RiEditLine,
  RiEdit2Line,
  RiRefreshLine,
  RiSave3Line,
  RiSparkling2Line,
  RiDeleteBinLine,
  RiCloseLine,
} from '@remixicon/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  type CreateDatasourceInput,
  type DatasourceDetailDTO,
  type TableColumnDTO,
  type TableSchemaDTO,
  fetchDatasourceDetail,
  generateSemanticDescriptions,
  removeDatasource,
  syncDatasource,
  updateColumnMetadata,
  updateDatasource,
  updateTableMetadata,
} from '../../lib/api';
import { cn } from '../../lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSpacer,
} from '../ui/table';
import { Textarea } from '../ui/textarea';

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

interface EditingTableState {
  tableId: number;
  tableComment: string;
  semanticDescription: string;
}

interface EditingColumnState {
  columnId: number;
  columnComment: string;
  semanticDescription: string;
}

const defaultForm: CreateDatasourceInput = {
  name: '',
  type: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  username: 'root',
  password: '',
  database: '',
  isDefault: false,
};

export default function DatasourceDetail({ initial }: { initial: DatasourceDetailDTO }) {
  const router = useRouter();
  const [datasource, setDatasource] = useState(initial);
  const [editingTable, setEditingTable] = useState<EditingTableState | null>(null);
  const [editingColumn, setEditingColumn] = useState<EditingColumnState | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // 编辑数据源相关状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<CreateDatasourceInput>(defaultForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canSubmitEdit = useMemo(() => {
    // 编辑时密码可以为空（表示不修改）
    return editForm.name && editForm.host && editForm.username && editForm.database;
  }, [editForm]);

  const handleEditTable = (table: TableSchemaDTO) => {
    setEditingTable({
      tableId: table.id,
      tableComment: table.tableComment ?? '',
      semanticDescription: table.semanticDescription ?? '',
    });
  };

  const handleSaveTable = async () => {
    if (!editingTable) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateTableMetadata(datasource.id, editingTable.tableId, {
        tableComment: editingTable.tableComment || null,
        semanticDescription: editingTable.semanticDescription || null,
      });
      setDatasource((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === editingTable.tableId
            ? {
                ...t,
                tableComment: editingTable.tableComment || undefined,
                semanticDescription: editingTable.semanticDescription || undefined,
              }
            : t,
        ),
      }));
      setEditingTable(null);
      setMessage('保存成功');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage((err as Error)?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTable = () => {
    setEditingTable(null);
  };

  const handleEditColumn = (tableId: number, column: TableColumnDTO) => {
    if (!column.id) return;
    setEditingColumn({
      columnId: column.id,
      columnComment: column.comment ?? '',
      semanticDescription: column.semanticDescription ?? '',
    });
  };

  const handleSaveColumn = async () => {
    if (!editingColumn) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateColumnMetadata(datasource.id, editingColumn.columnId, {
        columnComment: editingColumn.columnComment || null,
        semanticDescription: editingColumn.semanticDescription || null,
      });
      setDatasource((prev) => ({
        ...prev,
        tables: prev.tables.map((t) => ({
          ...t,
          columns: t.columns.map((c) =>
            c.id === editingColumn.columnId
              ? {
                  ...c,
                  comment: editingColumn.columnComment || undefined,
                  semanticDescription: editingColumn.semanticDescription || undefined,
                }
              : c,
          ),
        })),
      }));
      setEditingColumn(null);
      setMessage('保存成功');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage((err as Error)?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelColumn = () => {
    setEditingColumn(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      await syncDatasource(datasource.id);
      // 重新获取详情数据以更新表结构
      const updated = await fetchDatasourceDetail(datasource.id);
      setDatasource(updated);
      toast.success('同步成功');
    } catch (err) {
      toast.error((err as Error)?.message ?? '同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateSemantic = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      await generateSemanticDescriptions(datasource.id);
      const updated = await fetchDatasourceDetail(datasource.id);
      setDatasource(updated);
      toast.success('语义描述生成完成');
    } catch (err) {
      toast.error((err as Error)?.message ?? '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const onEditFormChange =
    (key: keyof CreateDatasourceInput) => (e: ChangeEvent<HTMLInputElement>) =>
      setEditForm((prev: CreateDatasourceInput) => ({
        ...prev,
        [key]: key === 'port' ? Number(e.target.value) : e.target.value,
      }));

  const handleOpenEditDialog = () => {
    setEditForm({
      name: datasource.name,
      type: datasource.type,
      host: datasource.host,
      port: datasource.port,
      username: datasource.username,
      password: '', // 编辑时不显示原有密码
      database: datasource.database,
      isDefault: datasource.isDefault,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditForm(defaultForm);
  };

  const handleEditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitEdit || editSubmitting) return;
    setEditSubmitting(true);
    try {
      // 编辑模式：如果密码为空，则不包含在更新数据中
      const updateData = { ...editForm };
      if (!updateData.password) {
        delete (updateData as Partial<CreateDatasourceInput>).password;
      }
      const updated = await updateDatasource(datasource.id, updateData);
      setDatasource((prev) => ({ ...prev, ...updated }));
      toast.success('数据源更新成功');
      handleCloseEditDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? '更新失败');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!globalThis.confirm('确定要删除该数据源吗？删除后无法恢复。')) return;
    setDeleting(true);
    try {
      await removeDatasource(datasource.id);
      toast.success('数据源已删除');
      router.push('/');
    } catch (err) {
      toast.error((err as Error)?.message ?? '删除失败');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <RiArrowLeftLine className="mr-2 h-4 w-4" />
            返回列表
          </Link>
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>数据源信息</CardTitle>
              <CardDescription>数据源的基础连接信息</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEditDialog}
                disabled={syncing || deleting || generating}
              >
                <RiEditLine className="mr-2 h-4 w-4" />
                编辑
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing || deleting || generating}
              >
                <RiRefreshLine className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? '同步中...' : '同步'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={syncing || deleting || generating}
              >
                <RiDeleteBinLine className="mr-2 h-4 w-4" />
                {deleting ? '删除中...' : '删除'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">名称</Label>
              <p className="text-sm font-medium">{datasource.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">类型</Label>
              <p className="text-sm font-medium uppercase">{datasource.type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Host</Label>
              <p className="text-sm font-medium">{`${datasource.host}:${datasource.port}`}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">数据库</Label>
              <p className="text-sm font-medium">{datasource.database}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">用户名</Label>
              <p className="text-sm font-medium">{datasource.username}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">最近同步</Label>
              <p className="text-sm font-medium text-muted-foreground">
                {formatDate(datasource.lastSyncAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>结构信息</CardTitle>
              <CardDescription>
                共 {datasource.tables.length} 个表，可编辑表注释和语义描述以帮助 AI
                更好地理解数据结构
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSemantic}
              disabled={syncing || deleting || generating}
            >
              <RiSparkling2Line className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? '生成中...' : '补充语义描述'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {message && (
            <div
              className={`mb-4 rounded-md p-3 text-sm ${
                message.includes('成功')
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {message}
            </div>
          )}

          {datasource.tables.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              暂无结构信息，请先同步数据源
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {datasource.tables.map((table) => (
                <AccordionItem key={table.id} value={`table-${table.id}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{table.tableName}</span>
                        {table.tableComment && (
                          <span className="text-xs text-muted-foreground">
                            {table.tableComment}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{table.columns.length} 列</span>
                        <div
                          className={cn(
                            buttonVariants({ variant: 'ghost', size: 'sm' }),
                            'cursor-pointer',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTable(table);
                          }}
                        >
                          <RiEdit2Line className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {editingTable?.tableId === table.id ? (
                        <Card className="shadow-none">
                          <CardContent className="pt-6">
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor={`table-comment-${table.id}`}>表注释</Label>
                                <Input
                                  id={`table-comment-${table.id}`}
                                  value={editingTable.tableComment}
                                  onChange={(e) =>
                                    setEditingTable({
                                      ...editingTable,
                                      tableComment: e.target.value,
                                    })
                                  }
                                  placeholder="数据库表注释"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`table-semantic-${table.id}`}>语义描述</Label>
                                <Textarea
                                  id={`table-semantic-${table.id}`}
                                  value={editingTable.semanticDescription}
                                  onChange={(e) =>
                                    setEditingTable({
                                      ...editingTable,
                                      semanticDescription: e.target.value,
                                    })
                                  }
                                  placeholder="用于 AI 理解表的业务含义和用途"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveTable} disabled={saving}>
                                  <RiSave3Line className="mr-2 h-4 w-4" />
                                  保存
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelTable}
                                  disabled={saving}
                                >
                                  <RiCloseLine className="mr-2 h-4 w-4" />
                                  取消
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {table.tableComment && (
                            <div>
                              <Label className="text-xs text-muted-foreground">表注释</Label>
                              <p className="text-sm">{table.tableComment}</p>
                            </div>
                          )}
                          {table.semanticDescription && (
                            <div>
                              <Label className="text-xs text-muted-foreground">语义描述</Label>
                              <p className="text-sm">{table.semanticDescription}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>列名</TableHead>
                              <TableHead>类型</TableHead>
                              <TableHead>注释</TableHead>
                              <TableHead>语义描述</TableHead>
                              <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableSpacer />
                          <TableBody>
                            {table.columns.map((column) => (
                              <TableRow key={column.name}>
                                <TableCell className="font-medium">{column.name}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {column.type}
                                </TableCell>
                                <TableCell>
                                  {editingColumn?.columnId === column.id ? (
                                    <Input
                                      value={editingColumn?.columnComment || ''}
                                      onChange={(e) =>
                                        editingColumn &&
                                        setEditingColumn({
                                          ...editingColumn,
                                          columnComment: e.target.value,
                                        })
                                      }
                                      placeholder="列注释"
                                      className="h-8"
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {column.comment || '-'}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingColumn?.columnId === column.id ? (
                                    <Textarea
                                      value={editingColumn?.semanticDescription || ''}
                                      onChange={(e) =>
                                        editingColumn &&
                                        setEditingColumn({
                                          ...editingColumn,
                                          semanticDescription: e.target.value,
                                        })
                                      }
                                      placeholder="语义描述"
                                      rows={2}
                                      className="min-w-[200px]"
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {column.semanticDescription || '-'}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingColumn?.columnId === column.id ? (
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSaveColumn}
                                        disabled={saving}
                                      >
                                        <RiSave3Line className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelColumn}
                                        disabled={saving}
                                      >
                                        <RiCloseLine className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditColumn(table.id, column)}
                                      disabled={!column.id || editingColumn !== null}
                                    >
                                      <RiEdit2Line className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                          <TableSpacer />
                        </Table>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑数据源</DialogTitle>
            <DialogDescription>修改数据源配置信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">名称</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={onEditFormChange('name')}
                  placeholder="如 production-mysql"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">类型</Label>
                  <Input id="edit-type" value={editForm.type} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-port">端口</Label>
                  <Input
                    id="edit-port"
                    type="number"
                    value={editForm.port}
                    onChange={onEditFormChange('port')}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-host">Host</Label>
                  <Input
                    id="edit-host"
                    value={editForm.host}
                    onChange={onEditFormChange('host')}
                    placeholder="127.0.0.1"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-database">数据库名</Label>
                  <Input
                    id="edit-database"
                    value={editForm.database}
                    onChange={onEditFormChange('database')}
                    placeholder="sparkset_demo"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">用户名</Label>
                  <Input
                    id="edit-username"
                    value={editForm.username}
                    onChange={onEditFormChange('username')}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">
                    密码 <span className="text-muted-foreground">(留空则不修改)</span>
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editForm.password}
                    onChange={onEditFormChange('password')}
                    placeholder="留空则不修改"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
                取消
              </Button>
              <Button type="submit" disabled={!canSubmitEdit || editSubmitting}>
                {editSubmitting ? '更新中...' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
