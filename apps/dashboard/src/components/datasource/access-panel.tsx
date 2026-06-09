'use client';

import {
  RiAddLine,
  RiArrowDownSLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiEdit2Line,
  RiShieldUserLine,
} from '@remixicon/react';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useTranslations } from '@/i18n/use-translations';
import {
  useDatasourceGrantSubjects,
  useDeleteDatasourceGrant,
  useDatasourceGrants,
  useUpsertDatasourceGrant,
} from '@/lib/api/datasources-hooks';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/date';
import type {
  DatasourceGrantDTO,
  DatasourcePermission,
  GrantSubjectRoleDTO,
  GrantSubjectType,
  GrantSubjectUserDTO,
} from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
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

const permissionLabelByValue = PERMISSION_OPTIONS.reduce(
  (labels, option) => {
    labels[option.value] = option.labelKey;
    return labels;
  },
  {} as Record<DatasourcePermission, string>,
);

const grantKey = (grant: DatasourceGrantDTO) => `${grant.subjectType}:${grant.subjectId}`;

const userSubjectId = (user: GrantSubjectUserDTO) => String(user.id);

const userDisplayName = (user: GrantSubjectUserDTO) => {
  return user.displayName?.trim() || user.username || `#${user.id}`;
};

export function AccessPanel({ datasourceId }: AccessPanelProps) {
  const t = useTranslations();
  const { data, error, isLoading, mutate } = useDatasourceGrants(datasourceId);
  const { trigger: upsertGrant, isMutating: saving } = useUpsertDatasourceGrant(datasourceId);
  const { trigger: removeGrant } = useDeleteDatasourceGrant(datasourceId);
  const [subjectType, setSubjectType] = useState<GrantSubjectType>('role');
  const [subjectId, setSubjectId] = useState('');
  const [permissions, setPermissions] = useState<DatasourcePermission[]>(defaultPermissions);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [grantPendingDelete, setGrantPendingDelete] = useState<DatasourceGrantDTO | null>(null);

  const grants = useMemo(() => data?.items ?? [], [data?.items]);
  const canManage = Boolean(data?.canManage);
  const { data: subjectsData, isLoading: subjectsLoading } = useDatasourceGrantSubjects(
    canManage ? datasourceId : null,
  );
  const selectedGrant = useMemo(() => {
    const normalizedSubjectId = subjectId.trim();
    if (!normalizedSubjectId) return null;
    return (
      grants.find(
        (grant) => grant.subjectType === subjectType && grant.subjectId === normalizedSubjectId,
      ) ?? null
    );
  }, [grants, subjectId, subjectType]);
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

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void handleSave();
    },
    [handleSave],
  );

  const handleEdit = useCallback((grant: DatasourceGrantDTO) => {
    setSubjectType(grant.subjectType);
    setSubjectId(grant.subjectId);
    setPermissions(grant.permissions);
  }, []);

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

        <form className="grid gap-4 border-b pb-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 lg:grid-cols-[160px_minmax(220px,1fr)]">
            <div className="grid gap-2">
              <Label htmlFor="grant-subject-type">{t('Subject Type')}</Label>
              <Select
                value={subjectType}
                onValueChange={(value) => {
                  setSubjectType(value as GrantSubjectType);
                  setSubjectId('');
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
              <Label>{t('Choose subject')}</Label>
              <SubjectSelector
                subjectType={subjectType}
                subjectId={subjectId}
                users={subjectsData?.users ?? []}
                roles={subjectsData?.roles ?? []}
                loading={subjectsLoading}
                disabled={!canManage || saving}
                onSubjectIdChange={setSubjectId}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="grant-subject-id">{t('Manual Subject ID')}</Label>
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

          {selectedGrant ? (
            <Alert>
              <RiEdit2Line className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t('Existing grant selected')}</AlertTitle>
              <AlertDescription>
                {t('Saving will update the existing grant for this subject')}
              </AlertDescription>
            </Alert>
          ) : null}

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
            <Button type="submit" size="sm" disabled={!canSubmit}>
              {selectedGrant ? (
                <RiEdit2Line className="h-4 w-4" aria-hidden="true" />
              ) : (
                <RiAddLine className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? t('Saving…') : selectedGrant ? t('Update Grant') : t('Save Grant')}
            </Button>
          </div>
        </form>

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
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Subject')}</TableHead>
                  <TableHead>{t('Permissions')}</TableHead>
                  <TableHead>{t('Updated')}</TableHead>
                  <TableHead className="w-24 text-right">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant) => {
                  const rowKey = grantKey(grant);
                  return (
                    <TableRow key={rowKey}>
                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-medium">
                            {grant.subjectType === 'role' ? t('Role') : t('User')}
                          </span>
                          <span className="break-all text-muted-foreground">{grant.subjectId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {grant.permissions.map((permission) => (
                            <Badge key={permission} variant="outline">
                              {t(permissionLabelByValue[permission] ?? permission)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(grant.updatedAt ?? grant.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={!canManage || saving}
                            aria-label={t('Edit grant')}
                            onClick={() => {
                              handleEdit(grant);
                            }}
                          >
                            <RiEdit2Line className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            disabled={!canManage || deletingKey === rowKey}
                            aria-label={t('Remove grant')}
                            onClick={() => {
                              setGrantPendingDelete(grant);
                            }}
                          >
                            <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(grantPendingDelete)}
        onOpenChange={(open) => {
          if (!open) setGrantPendingDelete(null);
        }}
        title={t('Confirm Remove Grant')}
        description={
          grantPendingDelete
            ? t(`Remove grant for '{subject}'? This cannot be undone`, {
                subject: `${grantPendingDelete.subjectType}:${grantPendingDelete.subjectId}`,
              })
            : undefined
        }
        confirmText={t('Remove')}
        loading={grantPendingDelete ? deletingKey === grantKey(grantPendingDelete) : false}
        onConfirm={async () => {
          if (!grantPendingDelete) return;
          await handleDelete(grantPendingDelete);
          setGrantPendingDelete(null);
        }}
      />
    </Card>
  );
}

interface SubjectSelectorProps {
  subjectType: GrantSubjectType;
  subjectId: string;
  users: GrantSubjectUserDTO[];
  roles: GrantSubjectRoleDTO[];
  loading: boolean;
  disabled: boolean;
  onSubjectIdChange: (subjectId: string) => void;
}

function SubjectSelector({
  subjectType,
  subjectId,
  users,
  roles,
  loading,
  disabled,
  onSubjectIdChange,
}: SubjectSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const selectedRole = subjectType === 'role' ? roles.find((role) => role.id === subjectId) : null;
  const selectedUser =
    subjectType === 'user' ? users.find((user) => userSubjectId(user) === subjectId) : null;
  const displayValue =
    selectedRole?.name ?? (selectedUser ? userDisplayName(selectedUser) : subjectId.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
        >
          <span className="min-w-0 truncate">
            {displayValue || (loading ? t('Loading subjects…') : t('Choose subject'))}
          </span>
          <RiArrowDownSLine className="h-4 w-4 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] max-w-[calc(100vw-2rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search subjects…')} />
          <CommandList>
            <CommandEmpty>{loading ? t('Loading subjects…') : t('No subjects found')}</CommandEmpty>
            <CommandGroup>
              {subjectType === 'role'
                ? roles.map((role) => (
                    <CommandItem
                      key={role.id}
                      value={`${role.id} ${role.name}`}
                      onSelect={() => {
                        onSubjectIdChange(role.id);
                        setOpen(false);
                      }}
                    >
                      <div className="flex w-full min-w-0 items-center gap-2">
                        <RiCheckLine
                          className={cn(
                            'h-4 w-4 shrink-0',
                            subjectId === role.id ? 'opacity-100' : 'opacity-0',
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{role.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {role.userCount} {t('users')}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))
                : users.map((user) => {
                    const value = userSubjectId(user);
                    const name = userDisplayName(user);
                    return (
                      <CommandItem
                        key={user.id}
                        value={`${user.id} ${name} ${user.username} ${user.email ?? ''}`}
                        onSelect={() => {
                          onSubjectIdChange(value);
                          setOpen(false);
                        }}
                      >
                        <div className="flex w-full min-w-0 items-center gap-2">
                          <RiCheckLine
                            className={cn(
                              'h-4 w-4 shrink-0',
                              subjectId === value ? 'opacity-100' : 'opacity-0',
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {user.username} · {user.provider}
                              {user.email ? ` · ${user.email}` : ''}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
