'use client';

import { RiDeleteBinLine, RiEditLine, RiRefreshLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useRouter } from '@/i18n/client-routing';
import { type ChangeEvent, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  fetchDatasourceDetail,
  deleteDatasource,
  syncDatasource,
  updateDatasource,
} from '../../lib/api/datasources-api';
import type { CreateDatasourceDto, DatasourceDetailDTO } from '@/types/api';
import { formatDateTime } from '@/lib/utils/date';
import { ConfirmDialog } from '../confirm-dialog';
import { PageHeader } from '../page-header';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
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
import { SchemaEditor } from './schema-editor';

type DatasourceForm = CreateDatasourceDto & { isDefault?: boolean };

const defaultForm: DatasourceForm = {
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
  const [syncing, setSyncing] = useState(false);
  const [schemaBusy, setSchemaBusy] = useState(false);

  // 编辑数据源相关状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<DatasourceForm>(defaultForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canSubmitEdit = useMemo(
    () => Boolean(editForm.name && editForm.host && editForm.username && editForm.database),
    [editForm],
  );
  const isBusy = syncing || deleting || schemaBusy;

  const handleSync = useCallback(async () => {
    setSyncing(true);
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
  }, [datasource.id, t]);

  const onEditFormChange = useCallback(
    (key: keyof DatasourceForm) => (e: ChangeEvent<HTMLInputElement>) =>
      setEditForm((prev: DatasourceForm) => ({
        ...prev,
        [key]: key === 'port' ? Number(e.target.value) : e.target.value,
      })),
    [],
  );

  const handleOpenEditDialog = useCallback(() => {
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
  }, [datasource]);

  const handleCloseEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setEditForm(defaultForm);
  }, []);

  const handleEditDialogOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        handleCloseEditDialog();
        return;
      }
      setEditDialogOpen(true);
    },
    [handleCloseEditDialog],
  );

  const handleEditSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!canSubmitEdit || editSubmitting) return;
      setEditSubmitting(true);
      try {
        // 编辑模式：如果密码为空，则不包含在更新数据中
        const { password, ...rest } = editForm;
        const updateData = password ? editForm : rest;
        const updated = await updateDatasource(datasource.id, updateData);
        setDatasource((prev) => ({ ...prev, ...updated }));
        toast.success(t('Datasource updated successfully'));
        handleCloseEditDialog();
      } catch (err) {
        toast.error((err as Error)?.message ?? t('Update failed'));
      } finally {
        setEditSubmitting(false);
      }
    },
    [canSubmitEdit, datasource.id, editForm, editSubmitting, handleCloseEditDialog, t],
  );

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await deleteDatasource(datasource.id);
      toast.success(t('Datasource deleted'));
      router.push('/dashboard/datasources');
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Delete failed'));
      setDeleting(false);
    }
  }, [datasource.id, router, t]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Datasource Info')}
        description={t('Basic connection information')}
        backButton="/dashboard/datasources"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenEditDialog} disabled={isBusy}>
              <RiEditLine className="h-4 w-4" aria-hidden="true" />
              {t('Edit')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleSync();
              }}
              disabled={isBusy}
            >
              <RiRefreshLine
                className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {syncing ? t('Syncing') : t('Sync')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteDialogOpen(true);
              }}
              disabled={isBusy}
            >
              <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />
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
                {formatDateTime(datasource.lastSyncAt)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SchemaEditor
        datasource={datasource}
        onDatasourceChange={setDatasource}
        onBusyChange={setSchemaBusy}
      />

      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Edit Datasource')}</DialogTitle>
            <DialogDescription>{t('Modify datasource configuration')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              void handleEditSubmit(e);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">{t('Name')}</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={editForm.name}
                  onChange={onEditFormChange('name')}
                  placeholder={t('eg production-mysql…')}
                  autoComplete="off"
                  disabled={editSubmitting}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-type">{t('Type')}</Label>
                  <Input id="edit-type" name="type" value={editForm.type} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-port">{t('Port')}</Label>
                  <Input
                    id="edit-port"
                    name="port"
                    type="number"
                    value={editForm.port}
                    onChange={onEditFormChange('port')}
                    inputMode="numeric"
                    min={1}
                    autoComplete="off"
                    disabled={editSubmitting}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-host">{t('Host')}</Label>
                  <Input
                    id="edit-host"
                    name="host"
                    value={editForm.host}
                    onChange={onEditFormChange('host')}
                    placeholder={t('eg 127.0.0.1…')}
                    autoComplete="off"
                    disabled={editSubmitting}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-database">{t('Database Name')}</Label>
                  <Input
                    id="edit-database"
                    name="database"
                    value={editForm.database}
                    onChange={onEditFormChange('database')}
                    placeholder={t('eg sparkset…')}
                    autoComplete="off"
                    disabled={editSubmitting}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">{t('Username')}</Label>
                  <Input
                    id="edit-username"
                    name="username"
                    value={editForm.username}
                    onChange={onEditFormChange('username')}
                    autoComplete="username"
                    spellCheck={false}
                    disabled={editSubmitting}
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
                    name="password"
                    type="password"
                    value={editForm.password}
                    onChange={onEditFormChange('password')}
                    placeholder={t('Leave empty to keep unchanged…')}
                    autoComplete="current-password"
                    disabled={editSubmitting}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEditDialog}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={!canSubmitEdit || editSubmitting}>
                {editSubmitting ? t('Updating…') : t('Update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('Delete Datasource')}
        description={t('Are you sure to delete this datasource? This cannot be recovered')}
        confirmText={t('Delete')}
        onConfirm={handleDelete}
        loading={deleting}
        variant="destructive"
      />
    </div>
  );
}
