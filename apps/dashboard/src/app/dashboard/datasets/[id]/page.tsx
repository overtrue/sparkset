'use client';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { DashboardSelector } from '@/components/dashboard-selector';
import { PageHeader } from '@/components/page-header';
import { ResultTable } from '@/components/query/result-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Link, useRouter } from '@/i18n/client-routing';
import { useTranslations } from '@/i18n/use-translations';
import { deleteDataset, fetchDatasetById, previewDataset, updateDataset } from '@/lib/api/datasets';
import type { Dataset, ResultSet } from '@/types/chart';
import { RiAddLine, RiDeleteBinLine, RiPlayLine, RiSaveLine } from '@remixicon/react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils/date';

export default function DatasetDetailPage() {
  const t = useTranslations();
  const tRef = useRef(t);
  const params = useParams();
  const router = useRouter();
  const datasetId = useMemo(() => Number(params.id), [params.id]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currentSql, setCurrentSql] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [queryResult, setQueryResult] = useState<ResultSet | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDataset = useCallback(async () => {
    if (!Number.isFinite(datasetId) || datasetId <= 0) {
      toast.error(tRef.current('Failed to load dataset'));
      router.push('/dashboard/datasets');
      return;
    }

    try {
      setLoading(true);
      const data = await fetchDatasetById(datasetId);
      setDataset(data);
      setName(data.name);
      setDescription(data.description || '');
      setCurrentSql(data.querySql);
      setQueryResult(null);
    } catch {
      toast.error(tRef.current('Failed to load dataset'));
      router.push('/dashboard/datasets');
    } finally {
      setLoading(false);
    }
  }, [datasetId, router]);

  useEffect(() => {
    void loadDataset();
  }, [loadDataset]);

  const hasChanges = useMemo(() => {
    if (!dataset) return false;
    return (
      name !== dataset.name ||
      description !== (dataset.description || '') ||
      currentSql !== dataset.querySql
    );
  }, [dataset, currentSql, description, name]);

  useEffect(() => {
    if (!hasChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const runQuery = useCallback(async () => {
    if (!dataset) return;

    try {
      setQueryLoading(true);
      setQueryResult(null);
      const result = await previewDataset(dataset.id);
      setQueryResult(result);
      toast.success(tRef.current('Query executed successfully'));
    } catch (error) {
      toast.error(tRef.current('Query execution failed'));
      console.error(error);
    } finally {
      setQueryLoading(false);
    }
  }, [dataset]);

  const saveDataset = useCallback(async () => {
    if (!dataset) return false;

    try {
      setSaving(true);
      await updateDataset(dataset.id, {
        name,
        description,
        querySql: currentSql,
      });
      toast.success(tRef.current('Dataset updated'));
      await loadDataset();
      return true;
    } catch {
      toast.error(tRef.current('Update failed'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [currentSql, dataset, description, loadDataset, name]);

  const handleSave = useCallback(async () => {
    await saveDataset();
  }, [saveDataset]);

  const handleSaveAndQuery = useCallback(async () => {
    const saved = await saveDataset();
    if (saved) {
      await runQuery();
    }
  }, [runQuery, saveDataset]);

  const handleDelete = async () => {
    if (!dataset) return;

    try {
      await deleteDataset(dataset.id);
      toast.success(tRef.current('Dataset deleted'));
      router.push('/dashboard/datasets');
    } catch {
      toast.error(tRef.current('Delete failed'));
    } finally {
      setDeleteConfirmOpen(false);
    }
  };

  const canSave = hasChanges && !saving;
  const isQueryBusy = queryLoading;

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
        backButton="/dashboard/datasets"
        action={
          <div className="flex gap-2">
            {dataset && <DashboardSelector type="dataset" contentId={dataset.id} size="sm" />}
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              <RiSaveLine className="h-4 w-4" aria-hidden="true" />
              {saving ? t('Saving…') : t('Save')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleSaveAndQuery} disabled={!canSave}>
              <RiSaveLine className="h-4 w-4" aria-hidden="true" />
              {saving ? t('Saving…') : t('Save and Query')}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />
              {t('Delete')}
            </Button>
          </div>
        }
      />
      <div className="flex items-center gap-2 border-b pb-4">
        <Label htmlFor="dataset-name" className="text-sm text-muted-foreground">
          {t('Name')}:
        </Label>
        <Input
          id="dataset-name"
          name="dataset-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('eg: Last 30 days sales data…')}
          autoComplete="off"
          spellCheck={false}
          className="h-8 text-sm flex-1 max-w-md"
        />
        <Label htmlFor="dataset-description" className="text-sm text-muted-foreground ml-4">
          {t('Description')}:
        </Label>
        <Input
          id="dataset-description"
          name="dataset-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Describe this dataset…')}
          autoComplete="off"
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
                id="dataset-sql"
                name="dataset-sql"
                value={currentSql}
                onChange={(e) => setCurrentSql(e.target.value)}
                rows={10}
                className="font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
                aria-label={t('SQL Query')}
              />
              <div className="flex gap-2 mt-4">
                <Button size="sm" onClick={runQuery} disabled={isQueryBusy}>
                  {isQueryBusy ? (
                    <RiPlayLine className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RiPlayLine className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isQueryBusy ? t('Executing…') : t('Execute Query')}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/charts/new?datasetId=${dataset.id}`}>
                    <RiAddLine className="h-4 w-4" aria-hidden="true" />
                    {t('Create Chart')}
                  </Link>
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
                {dataset.schemaJson?.map(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (field: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm p-2 bg-muted rounded"
                    >
                      <span className="font-medium">{field.name}</span>
                      <Badge variant="secondary">{field.type}</Badge>
                    </div>
                  ),
                )}
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
                <span className="font-medium">{formatDateTime(dataset.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Updated At')}:</span>
                <span className="font-medium">{formatDateTime(dataset.updatedAt)}</span>
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
