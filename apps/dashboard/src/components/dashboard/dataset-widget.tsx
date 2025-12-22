'use client';

import { useEffect, useState } from 'react';
import { datasetsApi } from '@/lib/api/datasets';
import type { ResultSet } from '@/types/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DatasetWidgetConfig } from '@/types/dashboard';

interface DatasetWidgetProps {
  config: DatasetWidgetConfig;
  refreshKey?: number; // 当这个 key 变化时，会重新加载数据
}

export function DatasetWidget({ config, refreshKey }: DatasetWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ResultSet | null>(null);

  const loadDataset = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await datasetsApi.preview(config.datasetId, {});
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据集失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.datasetId, refreshKey]);

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
        暂无数据
      </div>
    );
  }

  const maxRows = config.maxRows ?? 10;
  const displayRows = data.rows.slice(0, maxRows);
  const columns = data.schema.columns.map((col) => col.name);

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
                    ? (row[col] as number).toLocaleString()
                    : String(row[col] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.rows.length > maxRows && (
        <div className="p-2 text-xs text-muted-foreground text-center">
          显示前 {maxRows} 行，共 {data.rows.length} 行
        </div>
      )}
    </div>
  );
}
