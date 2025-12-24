'use client';

import {
  RiCloseLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiEditLine,
  RiRefreshLine,
  RiSave3Line,
  RiSparkling2Line,
} from '@remixicon/react';
import { useTranslations } from 'next-intl';
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
import { PageHeader } from '../page-header';
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
  const t = useTranslations();
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
      setMessage(t('Saved successfully'));
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage((err as Error)?.message ?? t('Save failed'));
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
      setMessage(t('Saved successfully'));
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage((err as Error)?.message ?? t('Save failed'));
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
      toast.success(t('Sync successful'));
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Sync failed'));
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
      toast.success(t('Semantic description generated'));
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Generation failed'));
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
      toast.success(t('Datasource updated successfully'));
      handleCloseEditDialog();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Update failed'));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!globalThis.confirm(t('Are you sure to delete this datasource? This cannot be recovered')))
      return;
    setDeleting(true);
    try {
      await removeDatasource(datasource.id);
      toast.success(t('Datasource deleted'));
      router.push('/');
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Delete failed'));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Datasource Info')}
        description={t('Basic connection information')}
        backButton="/"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenEditDialog}
              disabled={syncing || deleting || generating}
            >
              <RiEditLine className="h-4 w-4" />
              {t('Edit')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || deleting || generating}
            >
              <RiRefreshLine className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? t('Syncing') : t('Sync')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={syncing || deleting || generating}
            >
              <RiDeleteBinLine className="h-4 w-4" />
              {deleting ? t('Deleting') : t('Delete')}
            </Button>
          </div>
        }
      />

      <Card className="shadow-none">
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">{t('Name')}</Label>
              <p className="text-sm font-medium">{datasource.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('Type')}</Label>
              <p className="text-sm font-medium uppercase">{datasource.type}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('Host')}</Label>
              <p className="text-sm font-medium">{`${datasource.host}:${datasource.port}`}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('Database')}</Label>
              <p className="text-sm font-medium">{datasource.database}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('Username')}</Label>
              <p className="text-sm font-medium">{datasource.username}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('Last Synced')}</Label>
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
              <CardTitle>{t('Schema Information')}</CardTitle>
              <CardDescription>
                {t(
                  '{count} tables - edit comments and semantic descriptions to help AI understand the data structure better',
                  { count: datasource.tables.length },
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateSemantic}
              disabled={syncing || deleting || generating}
            >
              <RiSparkling2Line className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? t('Generating') : t('Add Semantic Description')}
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
              {t('No schema info, please sync the datasource first')}
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
                        <span>{t('{count} columns', { count: table.columns.length })}</span>
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
                                <Label htmlFor={`table-comment-${table.id}`}>
                                  {t('Table Comment')}
                                </Label>
                                <Input
                                  id={`table-comment-${table.id}`}
                                  value={editingTable.tableComment}
                                  onChange={(e) =>
                                    setEditingTable({
                                      ...editingTable,
                                      tableComment: e.target.value,
                                    })
                                  }
                                  placeholder={t('Database table comment')}
                                />
                              </div>
                              <div>
                                <Label htmlFor={`table-semantic-${table.id}`}>
                                  {t('Semantic Description')}
                                </Label>
                                <Textarea
                                  id={`table-semantic-${table.id}`}
                                  value={editingTable.semanticDescription}
                                  onChange={(e) =>
                                    setEditingTable({
                                      ...editingTable,
                                      semanticDescription: e.target.value,
                                    })
                                  }
                                  placeholder={t(
                                    "Used for AI to understand the table's business meaning and purpose",
                                  )}
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveTable} disabled={saving}>
                                  <RiSave3Line className="h-4 w-4" />
                                  {t('Save')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelTable}
                                  disabled={saving}
                                >
                                  <RiCloseLine className="h-4 w-4" />
                                  {t('Cancel')}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {table.tableComment && (
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                {t('Table Comment')}
                              </Label>
                              <p className="text-sm">{table.tableComment}</p>
                            </div>
                          )}
                          {table.semanticDescription && (
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                {t('Semantic Description')}
                              </Label>
                              <p className="text-sm">{table.semanticDescription}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>{t('Column Name')}</TableHead>
                              <TableHead>{t('Type')}</TableHead>
                              <TableHead>{t('Comment')}</TableHead>
                              <TableHead>{t('Semantic Description')}</TableHead>
                              <TableHead className="text-right">{t('Actions')}</TableHead>
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
                                      placeholder={t('Column Comment')}
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
                                      placeholder={t('Semantic Description')}
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
            <DialogTitle>{t('Edit Datasource')}</DialogTitle>
            <DialogDescription>{t('Modify datasource configuration')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t('Name')}</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={onEditFormChange('name')}
                  placeholder={t('eg production-mysql')}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">{t('Type')}</Label>
                  <Input id="edit-type" value={editForm.type} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-port">{t('Port')}</Label>
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
                  <Label htmlFor="edit-database">{t('Database Name')}</Label>
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
                  <Label htmlFor="edit-username">{t('Username')}</Label>
                  <Input
                    id="edit-username"
                    value={editForm.username}
                    onChange={onEditFormChange('username')}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">
                    {t('Password')}{' '}
                    <span className="text-muted-foreground">
                      {t('(Leave empty to keep unchanged)')}
                    </span>
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={editForm.password}
                    onChange={onEditFormChange('password')}
                    placeholder={t('Leave empty to keep unchanged')}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={!canSubmitEdit || editSubmitting}>
                {editSubmitting ? t('Updating') : t('Update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
