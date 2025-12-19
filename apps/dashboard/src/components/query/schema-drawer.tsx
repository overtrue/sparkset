'use client';
import { RiDatabase2Line, RiRefreshLine } from '@remixicon/react';

import { useEffect, useState } from 'react';
import { fetchSchema, TableSchemaDTO } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

interface SchemaDrawerProps {
  datasourceId?: number;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SchemaDrawer({ datasourceId, trigger, open, onOpenChange }: SchemaDrawerProps) {
  const [schema, setSchema] = useState<TableSchemaDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchema = async (id?: number) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSchema(id);
      setSchema(res);
    } catch (err) {
      setError((err as Error)?.message ?? '加载 Schema 失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && datasourceId) {
      void loadSchema(datasourceId);
    }
  }, [open, datasourceId]);

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2 shrink-0">
      <RiDatabase2Line className="h-4 w-4" />
      查看 Schema
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger ?? defaultTrigger}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <RiDatabase2Line className="h-5 w-5" />
                Schema 缓存
              </SheetTitle>
              <SheetDescription className="mt-2">
                {datasourceId ? `数据源 #${datasourceId} 的表结构信息` : '请先选择数据源'}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => {
                void loadSchema(datasourceId);
              }}
              disabled={loading}
            >
              <RiRefreshLine className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </SheetHeader>
        <div className="mt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : schema.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              暂无缓存的表结构，先执行一次同步或查询触发缓存。
            </div>
          ) : (
            <div className="space-y-3">
              {schema.map((table) => (
                <Card key={table.tableName} className="shadow-none bg-muted/20 border-muted">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-sm">{table.tableName}</div>
                      <Badge variant="secondary" className="text-xs">
                        {table.columns.length} 列
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {table.columns.map((col) => (
                        <Badge key={col.name} variant="outline" className="text-xs font-normal">
                          {col.name}
                          <span className="ml-1 text-muted-foreground">({col.type})</span>
                          {col.comment && (
                            <span className="ml-1 text-muted-foreground">· {col.comment}</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
