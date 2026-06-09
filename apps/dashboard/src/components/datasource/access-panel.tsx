'use client';

import { RiAddLine, RiDeleteBinLine, RiShieldUserLine } from '@remixicon/react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import {
  useDeleteDatasourceGrant,
  useDatasourceGrants,
  useUpsertDatasourceGrant,
} from '@/lib/api/datasources-hooks';
import { formatDateTime } from '@/lib/utils/date';
import type { DatasourceGrantDTO, DatasourcePermission, GrantSubjectType } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface AccessPanelProps {
  datasourceId: number;
}

const PERMISSION_OPTIONS: { value: DatasourcePermission; labelKey: string }[] = [
  { value: 'datasource:view', labelKey: 'View metadata' },
  { value: 'datasource:query', labelKey: 'Query data' },
  { value: 'datasource:sync_schema', labelKey: 'Sync schema' },
  { value: 'datasource:manage', labelKey: 'Manage datasource' },
  { value: 'datasource:manage_credentials', labelKey: 'Manage credentials' },
  { value: 'datasource:grant', labelKey: 'Manage grants' },
];

const defaultPermissions: DatasourcePermission[] = ['datasource:view', 'datasource:query'];

const grantKey = (grant: DatasourceGrantDTO) => `${grant.subjectType}:${grant.subjectId}`;

export function AccessPanel({ datasourceId }: AccessPanelProps) {
  const t = useTranslations();
  const { data, error, isLoading, mutate } = useDatasourceGrants(datasourceId);
  const { trigger: upsertGrant, isMutating: saving } = useUpsertDatasourceGrant(datasourceId);
  const { trigger: removeGrant } = useDeleteDatasourceGrant(datasourceId);
  const [subjectType, setSubjectType] = useState<GrantSubjectType>('role');
  const [subjectId, setSubjectId] = useState('');
  const [permissions, setPermissions] = useState<DatasourcePermission[]>(defaultPermissions);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const grants = useMemo(() => data?.items ?? [], [data?.items]);
  const canManage = Boolean(data?.canManage);
  const canSubmit = canManage && subjectId.trim().length > 0 && permissions.length > 0 && !saving;

  const togglePermission = useCallback((permission: DatasourcePermission, checked: boolean) => {
    setPermissions((prev) => {
      if (checked) {
        return prev.includes(permission) ? prev : [...prev, permission];
      }
      return prev.filter((item) => item !== permission);
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSubmit) return;

    try {
      await upsertGrant({
        subjectType,
        subjectId: subjectId.trim(),
        permissions,
      });
      toast.success(t('Grant saved'));
      setSubjectId('');
      setPermissions(defaultPermissions);
      await mutate();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Failed to save grant'));
    }
  }, [canSubmit, mutate, permissions, subjectId, subjectType, t, upsertGrant]);

  const handleDelete = useCallback(
    async (grant: DatasourceGrantDTO) => {
      const key = grantKey(grant);
      setDeletingKey(key);
      try {
        await removeGrant({ subjectType: grant.subjectType, subjectId: grant.subjectId });
        toast.success(t('Grant removed'));
        await mutate();
      } catch (err) {
        toast.error((err as Error)?.message ?? t('Failed to remove grant'));
      } finally {
        setDeletingKey(null);
      }
    },
    [mutate, removeGrant, t],
  );

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{t('Access Control')}</CardTitle>
            <CardDescription>{t('Datasource grants')}</CardDescription>
          </div>
          <Badge variant={canManage ? 'default' : 'outline'}>
            {canManage ? t('Grant manager') : t('Read only')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <Alert variant="destructive">
            <RiShieldUserLine className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t('Access grants unavailable')}</AlertTitle>
            <AlertDescription>
              {(error as Error)?.message ?? t('Failed to load access grants')}
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !canManage ? (
          <Alert>
            <RiShieldUserLine className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t('Read-only access')}</AlertTitle>
            <AlertDescription>
              {t('You need datasource:grant permission to change access grants')}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 border-b pb-5">
          <div className="grid gap-3 md:grid-cols-[160px_minmax(180px,1fr)]">
            <div className="grid gap-2">
              <Label htmlFor="grant-subject-type">{t('Subject Type')}</Label>
              <Select
                value={subjectType}
                onValueChange={(value) => {
                  setSubjectType(value as GrantSubjectType);
                }}
                disabled={!canManage || saving}
              >
                <SelectTrigger id="grant-subject-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">{t('Role')}</SelectItem>
                  <SelectItem value="user">{t('User')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grant-subject-id">{t('Subject ID')}</Label>
              <Input
                id="grant-subject-id"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                }}
                placeholder={subjectType === 'role' ? t('eg analyst') : t('eg 1001')}
                autoComplete="off"
                disabled={!canManage || saving}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium leading-none">{t('Permissions')}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_OPTIONS.map((option) => {
                const checkboxId = `grant-permission-${option.value.replace(/[^a-z0-9]/gi, '-')}`;
                return (
                  <div
                    key={option.value}
                    className="flex min-h-9 items-center gap-2 border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={permissions.includes(option.value)}
                      onCheckedChange={(checked) => {
                        togglePermission(option.value, checked === true);
                      }}
                      disabled={!canManage || saving}
                    />
                    <Label htmlFor={checkboxId} className="font-normal">
                      {t(option.labelKey)}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={() => {
                void handleSave();
              }}
            >
              <RiAddLine className="h-4 w-4" aria-hidden="true" />
              {saving ? t('Saving…') : t('Save Grant')}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : grants.length === 0 ? (
          <div className="border py-8 text-center text-sm text-muted-foreground">
            {t('No datasource grants')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Subject')}</TableHead>
                <TableHead>{t('Permissions')}</TableHead>
                <TableHead>{t('Updated')}</TableHead>
                <TableHead className="w-16 text-right">{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((grant) => (
                <TableRow key={grantKey(grant)}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {grant.subjectType === 'role' ? t('Role') : t('User')}
                      </span>
                      <span className="text-muted-foreground">{grant.subjectId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {grant.permissions.map((permission) => (
                        <Badge key={permission} variant="outline">
                          {t(permission)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(grant.updatedAt ?? grant.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      disabled={!canManage || deletingKey === grantKey(grant)}
                      aria-label={t('Remove grant')}
                      onClick={() => {
                        void handleDelete(grant);
                      }}
                    >
                      <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
