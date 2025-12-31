'use client';
import { RiDatabase2Line, RiRefreshLine } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
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
  const t = useTranslations();
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
      setError((err as Error)?.message ?? t('Failed to load schema'));
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
    <Button variant="outline" size="sm" className="h-7 px-3 gap-1.5 text-xs shrink-0">
      <RiDatabase2Line className="h-3.5 w-3.5" />
      {t('View Schema')}
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
                {t('Schema Cache')}
              </SheetTitle>
              <SheetDescription className="mt-2">
                {datasourceId
                  ? t('Schema for datasource #{id}', { id: datasourceId })
                  : t('Please select a datasource first')}
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
              {t('No cached schema, execute a sync or query to trigger caching')}
            </div>
          ) : (
            <div className="space-y-3">
              {schema.map((table) => (
                <Card key={table.tableName} className="shadow-none bg-muted/20 border-muted">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium text-sm">{table.tableName}</div>
                      <Badge variant="secondary">
                        {t('{count} columns', { count: table.columns.length })}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {table.columns.map((col) => (
                        <Badge key={col.name} variant="outline" className="font-normal">
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
