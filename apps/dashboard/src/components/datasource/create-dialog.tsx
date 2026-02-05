'use client';

import { useTranslations } from '@/i18n/use-translations';
import { RiCheckboxCircleLine, RiCloseCircleLine, RiLoader4Line } from '@remixicon/react';
import { type ChangeEvent, type MouseEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type {
  CreateDatasourceDto,
  Datasource,
  TestConnectionDto,
  TestConnectionResult,
} from '@/types/api';
import { createDatasource, testConnection, updateDatasource } from '../../lib/api/datasources-api';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type CreateDatasourceInput = CreateDatasourceDto & { isDefault?: boolean };

const DATABASE_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'sqlite', label: 'SQLite' },
];

const PORT_BY_TYPE: Record<string, number> = {
  mysql: 3306,
  postgres: 5432,
  sqlite: 0,
};

const CONNECTION_FIELD_KEYS = new Set<keyof CreateDatasourceInput>([
  'type',
  'host',
  'port',
  'username',
  'password',
  'database',
]);

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

interface CreateDatasourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasource?: Datasource;
  onSuccess: (datasource: Datasource) => void;
}

export function CreateDatasourceDialog({
  open,
  onOpenChange,
  datasource,
  onSuccess,
}: CreateDatasourceDialogProps) {
  const t = useTranslations();
  const [form, setForm] = useState<CreateDatasourceInput>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const isEditing = Boolean(datasource);
  const isBusy = submitting || testing;

  useEffect(() => {
    if (!open) return;
    if (datasource) {
      setForm({
        name: datasource.name,
        type: datasource.type,
        host: datasource.host,
        port: datasource.port,
        username: datasource.username,
        password: '',
        database: datasource.database,
        isDefault: datasource.isDefault,
      } as CreateDatasourceInput);
    } else {
      setForm(defaultForm);
    }
    setTestResult(null);
    setTesting(false);
    setIsVerified(false);
  }, [datasource, open]);

  // 测试需要完整的连接信息（密码可以为空）
  const canTest = Boolean(form.host && form.username && form.database);

  // 必须验证通过，且所有基础字段完整
  const isFormComplete = Boolean(form.name && form.host && form.username && form.database);
  const canSubmit = Boolean(isVerified && isFormComplete);

  const onChange =
    (key: keyof CreateDatasourceInput) => (e: ChangeEvent<HTMLInputElement> | string) => {
      const value = typeof e === 'string' ? e : e.target.value;

      // 智能端口切换：当切换数据库类型时自动更新默认端口
      if (key === 'type') {
        const newPort = PORT_BY_TYPE[value as string] ?? 3306;
        setForm(
          (prev: CreateDatasourceInput) =>
            ({
              ...prev,
              type: value,
              port: newPort,
            }) as CreateDatasourceInput,
        );
      } else {
        setForm((prev: CreateDatasourceInput) => ({
          ...prev,
          [key]: key === 'port' ? Number(value) : value,
        }));
      }

      if (CONNECTION_FIELD_KEYS.has(key)) {
        // 用户修改连接配置时，重置验证状态
        setIsVerified(false);
        setTestResult(null);
      }
    };

  const handleTestConnection = async (e?: MouseEvent<HTMLButtonElement>) => {
    if (e) e.preventDefault();
    if (!canTest || testing) return;
    setTesting(true);
    try {
      const testConfig: TestConnectionDto = {
        type: form.type,
        host: form.host,
        port: form.port,
        username: form.username,
        password: form.password,
        database: form.database,
      };
      const result = await testConnection(testConfig);

      setTestResult(result);
      if (result.success) {
        setIsVerified(true);
        toast.success(t('Connection verified'));
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
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      let result: Datasource;
      if (datasource) {
        const updateData = { ...form };
        if (!updateData.password) {
          delete (updateData as Partial<CreateDatasourceInput>).password;
        }
        result = await updateDatasource(datasource.id, updateData);
        toast.success(t('Datasource updated successfully'));
      } else {
        result = await createDatasource(form);
        toast.success(t('Datasource created successfully'));
      }
      onSuccess(result);
      handleClose();
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Operation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(defaultForm);
    setTestResult(null);
    setTesting(false);
    setIsVerified(false);
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose();
      return;
    }
    onOpenChange(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{datasource ? t('Edit Datasource') : t('Add Datasource')}</DialogTitle>
          <DialogDescription>
            {datasource
              ? t(
                  'Modify datasource configuration, verify connection after modification is recommended',
                )
              : t('Fill in the information below and verify the connection to create a datasource')}
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
                name="name"
                value={form.name}
                onChange={onChange('name')}
                placeholder={t('eg production-mysql…')}
                autoComplete="off"
                disabled={isBusy}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">{t('Type')}</Label>
                <Select
                  name="type"
                  value={form.type}
                  onValueChange={(value) => onChange('type')(value)}
                  disabled={isBusy}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder={t('Select database type…')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DATABASE_TYPES.map((dbType) => (
                      <SelectItem key={dbType.value} value={dbType.value}>
                        {dbType.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="port">{t('Port')}</Label>
                <Input
                  id="port"
                  name="port"
                  type="number"
                  value={form.port}
                  onChange={onChange('port')}
                  inputMode="numeric"
                  min={1}
                  autoComplete="off"
                  disabled={isBusy}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="host">{t('Host')}</Label>
                <Input
                  id="host"
                  name="host"
                  value={form.host}
                  onChange={onChange('host')}
                  placeholder={t('eg 127.0.0.1…')}
                  autoComplete="off"
                  disabled={isBusy}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="database">{t('Database Name')}</Label>
                <Input
                  id="database"
                  name="database"
                  value={form.database}
                  onChange={onChange('database')}
                  placeholder={t('eg sparkset…')}
                  autoComplete="off"
                  disabled={isBusy}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">{t('Username')}</Label>
                <Input
                  id="username"
                  name="username"
                  value={form.username}
                  onChange={onChange('username')}
                  autoComplete="username"
                  spellCheck={false}
                  disabled={isBusy}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">
                  {t('Password')}{' '}
                  {isEditing && (
                    <span className="text-muted-foreground">
                      {t('(Leave empty to keep unchanged)')}
                    </span>
                  )}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onChange('password')}
                  placeholder={
                    isEditing
                      ? t('Leave empty to keep unchanged…')
                      : t('Leave empty for passwordless connection…')
                  }
                  autoComplete="current-password"
                  disabled={isBusy}
                />
              </div>
            </div>

            {/* 连通性验证状态区域 */}
            {(testResult !== null || testing) && (
              <div
                className="rounded-lg border p-3 space-y-2 bg-muted/50"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 font-medium">
                  {testing && (
                    <>
                      <RiLoader4Line
                        className="h-4 w-4 animate-spin text-blue-500"
                        aria-hidden="true"
                      />
                      <span className="text-blue-600">{t('Verifying database connection…')}</span>
                    </>
                  )}
                  {testResult?.success && !testing && (
                    <>
                      <RiCheckboxCircleLine className="h-4 w-4 text-green-500" aria-hidden="true" />
                      <span className="text-green-600">
                        {t('Connection verified successfully')}
                      </span>
                    </>
                  )}
                  {testResult?.success === false && !testing && (
                    <>
                      <RiCloseCircleLine className="h-4 w-4 text-red-500" aria-hidden="true" />
                      <span className="text-red-600">{t('Connection verification failed')}</span>
                    </>
                  )}
                </div>
                {testResult?.message && (
                  <p className="text-sm text-muted-foreground">{testResult.message}</p>
                )}
                {isEditing && testResult?.success === false && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t(
                      'Tip: Please check the database configuration including host, port, username and password',
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 sm:flex-col-reverse sm:gap-0">
            <div className="flex gap-2 sm:flex-row-reverse">
              {!canSubmit ? (
                <>
                  {/* 创建/编辑模式：只显示验证连通性按钮 */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void handleTestConnection();
                    }}
                    disabled={!canTest || isBusy}
                    className="w-full sm:w-auto"
                    title={t('Verify Connection')}
                  >
                    {testing ? t('Verifying…') : t('Verify Connection')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
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
                      ? datasource
                        ? t('Updating…')
                        : t('Creating…')
                      : datasource
                        ? t('Save')
                        : t('Add')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
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
  );
}
