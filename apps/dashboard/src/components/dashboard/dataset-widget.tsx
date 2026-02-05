'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { previewDataset } from '@/lib/api/datasets';
import type { ResultSet } from '@/types/chart';
import type { DatasetWidgetConfig } from '@/types/dashboard';
import { useTranslations } from '@/i18n/use-translations';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface DatasetWidgetProps {
  config: DatasetWidgetConfig;
  refreshKey?: number; // 当这个 key 变化时，会重新加载数据
}

export function DatasetWidget({ config, refreshKey }: DatasetWidgetProps) {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultSet | null>(null);
  const maxRows = config.maxRows ?? 10;
  const displayRows = useMemo(() => (data?.rows ?? []).slice(0, maxRows), [data?.rows, maxRows]);
  const columns = useMemo(
    () => data?.schema?.columns?.map((col) => col.name) ?? [],
    [data?.schema?.columns],
  );

  const loadDataset = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await previewDataset(config.datasetId, {});
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load dataset'));
    } finally {
      setLoading(false);
    }
  }, [config.datasetId, t]);

  useEffect(() => {
    void loadDataset();
  }, [loadDataset, refreshKey]);

  if (loading) {
    return (
      <div className="h-full p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-muted-foreground">
        {t('No Data')}
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="sticky top-0 bg-background">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayRows.map((row, idx) => (
            <TableRow key={idx}>
              {columns.map((col) => (
                <TableCell key={col}>
                  {typeof row[col] === 'number'
                    ? row[col].toLocaleString()
                    : String(row[col] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.rows.length > maxRows && (
        <div className="p-2 text-xs text-muted-foreground text-center">
          {t('Show first {maxRows} rows of {totalRows} rows', {
            maxRows,
            totalRows: data.rows.length,
          })}
        </div>
      )}
    </div>
  );
}
