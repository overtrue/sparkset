'use client';
import { RiBarChartLine, RiCodeSSlashLine, RiFileTextLine, RiSave3Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';

import { SaveActionDialog } from '@/components/action/save-dialog';
import { SaveChartDialog } from '@/components/charts/save-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QueryResponse } from '@/lib/query';
import { useState } from 'react';
import { buildQueryResultCountLabel } from './result-count';
import { ResultTable } from './result-table';
import { SchemaDrawer } from './schema-drawer';
import { SqlViewer } from './sql-viewer';

interface QueryResultProps {
  result: QueryResponse;
  datasourceId?: number;
  question?: string;
}

export function QueryResult({ result, datasourceId, question }: QueryResultProps) {
  const t = useTranslations();
  const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveChartDialogOpen, setSaveChartDialogOpen] = useState(false);
  const [querySqlViewerOpen, setQuerySqlViewerOpen] = useState(false);
  const rowCount = result.rowCount ?? result.rows?.length ?? 0;
  const hasRows = result.hasResult ?? rowCount > 0;
  const saveDisabledReason = t('No matching records in the table');

  return (
    <TooltipProvider>
      <Card className="shadow-none py-0 overflow-hidden w-full max-w-full border-border/50 gap-0">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/50 gap-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <RiFileTextLine className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="font-semibold text-sm">{t('Query Result')}</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {buildQueryResultCountLabel(t, rowCount)}
                {result.summary && ` · ${result.summary}`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <SqlViewer
                      sql={result.sql}
                      open={querySqlViewerOpen}
                      onOpenChange={setQuerySqlViewerOpen}
                      trigger={
                        <Button variant="outline" size="sm" className="h-7 px-3 gap-1.5 text-xs">
                          <RiCodeSSlashLine className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('View SQL')}
                        </Button>
                      }
                    />
                  </span>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 gap-1.5 text-xs"
                      onClick={() => setSaveDialogOpen(true)}
                    >
                      <RiSave3Line className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('Save as Action')}
                    </Button>
                  </span>
                </TooltipTrigger>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 gap-1.5 text-xs"
                      disabled={!hasRows}
                      onClick={() => setSaveChartDialogOpen(true)}
                    >
                      <RiBarChartLine className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('Save as Chart')}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!hasRows ? <TooltipContent>{saveDisabledReason}</TooltipContent> : null}
              </Tooltip>
              <SchemaDrawer
                datasourceId={datasourceId}
                open={schemaDrawerOpen}
                onOpenChange={setSchemaDrawerOpen}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ResultTable rows={result.rows ?? []} />
        </CardContent>
      </Card>

      <SaveActionDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        sql={result.sql}
        datasourceId={datasourceId}
        defaultName={question || ''}
      />

      <SaveChartDialog
        open={saveChartDialogOpen}
        onOpenChange={setSaveChartDialogOpen}
        sql={result.sql}
        datasourceId={datasourceId}
        rows={result.rows}
        defaultName={question || ''}
      />
    </TooltipProvider>
  );
}
