'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DashboardSelector } from '@/components/dashboard-selector';
import { PageHeader } from '@/components/page-header';
import { ResultTable } from '@/components/query/result-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from '@/i18n/routing';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dataset, ResultSet } from '@/types/chart';
import { RiAddLine, RiDeleteBinLine, RiPlayLine, RiSaveLine } from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function DatasetDetailPage() {
  const t = useTranslations();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currentSql, setCurrentSql] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [queryResult, setQueryResult] = useState<ResultSet | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDataset();
  }, [id]);

  const loadDataset = async () => {
    try {
      setLoading(true);
      const data = await datasetsApi.get(Number(id));
      setDataset(data);
      setName(data.name);
      setDescription(data.description || '');
      setCurrentSql(data.querySql);
    } catch (error) {
      toast.error(t('Failed to load dataset'));
      router.push('/datasets');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    if (!dataset) return false;
    return (
      name !== dataset.name ||
      description !== (dataset.description || '') ||
      currentSql !== dataset.querySql
    );
  };

  const handleSave = async () => {
    if (!dataset) return;

    try {
      setSaving(true);
      await datasetsApi.update(dataset.id, {
        name,
        description,
        querySql: currentSql,
      });
      toast.success(t('Dataset updated'));
      await loadDataset();
    } catch (error) {
      toast.error(t('Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndQuery = async () => {
    if (!dataset) return;

    try {
      setSaving(true);
      await datasetsApi.update(dataset.id, {
        name,
        description,
        querySql: currentSql,
      });
      toast.success(t('Dataset updated'));
      await loadDataset();
      await handleExecuteQueryWithSql(currentSql);
    } catch (error) {
      toast.error(t('Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteQueryWithSql = async (sql: string) => {
    if (!dataset) return;

    try {
      setQueryLoading(true);
      setQueryResult(null);
      const result = await datasetsApi.preview(dataset.id);
      setQueryResult(result);
      toast.success(t('Query executed successfully'));
    } catch (error) {
      toast.error(t('Query execution failed'));
      console.error(error);
    } finally {
      setQueryLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!dataset) return;

    try {
      await datasetsApi.delete(dataset.id);
      toast.success(t('Dataset deleted'));
      router.push('/datasets');
    } catch (error) {
      toast.error(t('Delete failed'));
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!dataset) return;

    try {
      setQueryLoading(true);
      setQueryResult(null);
      const result = await datasetsApi.preview(dataset.id);
      setQueryResult(result);
      toast.success(t('Query executed successfully'));
    } catch (error) {
      toast.error(t('Query execution failed'));
      console.error(error);
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!dataset) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={name}
        backButton="/datasets"
        action={
          <div className="flex gap-2">
            {dataset && <DashboardSelector type="dataset" contentId={dataset.id} size="sm" />}
            <Button size="sm" onClick={handleSave} disabled={!hasChanges() || saving}>
              <RiSaveLine className="h-4 w-4" />
              {saving ? t('Saving…') : t('Save')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveAndQuery}
              disabled={!hasChanges() || saving}
            >
              <RiSaveLine className="h-4 w-4" />
              {saving ? t('Saving…') : t('Save and Query')}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <RiDeleteBinLine className="h-4 w-4" />
              {t('Delete')}
            </Button>
          </div>
        }
      />
      <div className="flex items-center gap-2 border-b pb-4">
        <span className="text-sm text-muted-foreground">{t('Name')}:</span>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Dataset Name')}
          className="h-8 text-sm flex-1 max-w-md"
        />
        <span className="text-sm text-muted-foreground ml-4">{t('Description')}:</span>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Description (optional)')}
          className="h-8 text-sm flex-1"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side: SQL Query - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('SQL Query')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={currentSql}
                onChange={(e) => setCurrentSql(e.target.value)}
                rows={10}
                className="font-mono text-xs"
              />
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={handleExecuteQuery} disabled={queryLoading}>
                  {queryLoading ? (
                    <RiPlayLine className="h-4 w-4 animate-spin" />
                  ) : (
                    <RiPlayLine className="h-4 w-4" />
                  )}
                  {queryLoading ? t('Executing…') : t('Execute Query')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/charts/new?datasetId=${dataset.id}`)}
                >
                  <RiAddLine className="h-4 w-4" />
                  {t('Create Chart')}
                </Button>
              </div>
              {queryResult && (
                <div className="mt-4 space-y-2 border-t pt-4">
                  <ResultTable rows={queryResult.rows} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right side: Data Structure + Metadata - takes 1/3 */}
        <div className="space-y-6">
          {/* Data Structure */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Data Structure')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dataset.schemaJson?.map((field: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                  >
                    <span className="font-medium">{field.name}</span>
                    <Badge variant="secondary">{field.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Metadata')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Datasource')}:</span>
                <span className="font-medium">{dataset.datasourceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Schema Hash')}:</span>
                <span className="font-mono text-xs">{dataset.schemaHash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Created At')}:</span>
                <span className="font-medium">{new Date(dataset.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Updated At')}:</span>
                <span className="font-medium">{new Date(dataset.updatedAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('Delete Dataset')}
        description={t(`Are you sure to delete '{name}'? This cannot be undone`, {
          name: dataset.name,
        })}
        onConfirm={handleDelete}
        confirmText={t('Delete')}
        cancelText={t('Cancel')}
        variant="destructive"
      />
    </div>
  );
}
