'use client';
import { RiBarChartLine, RiFileTextLine, RiSave3Line } from '@remixicon/react';

import { SaveActionDialog } from '@/components/action/save-dialog';
import { SaveChartDialog } from '@/components/charts/save-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { QueryResponse } from '@/lib/query';
import { useState } from 'react';
import { ResultTable } from './result-table';
import { SchemaDrawer } from './schema-drawer';
import { SqlViewer } from './sql-viewer';

interface QueryResultProps {
  result: QueryResponse;
  datasourceId?: number;
  question?: string;
}

export function QueryResult({ result, datasourceId, question }: QueryResultProps) {
  const [sqlDrawerOpen, setSqlDrawerOpen] = useState(false);
  const [schemaDrawerOpen, setSchemaDrawerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveChartDialogOpen, setSaveChartDialogOpen] = useState(false);

  return (
    <>
      <Card className="shadow-none py-0 overflow-hidden w-full max-w-full border-border/50 gap-0">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/50">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <RiFileTextLine className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">查询结果</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {result.rows.length} 行{result.summary && ` · ${result.summary}`}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 gap-1.5 text-xs"
                onClick={() => setSaveDialogOpen(true)}
              >
                <RiSave3Line className="h-3.5 w-3.5" />
                保存为 Action
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 gap-1.5 text-xs"
                onClick={() => setSaveChartDialogOpen(true)}
              >
                <RiBarChartLine className="h-3.5 w-3.5" />
                保存为图表
              </Button>
              <SqlViewer sql={result.sql} open={sqlDrawerOpen} onOpenChange={setSqlDrawerOpen} />
              <SchemaDrawer
                datasourceId={datasourceId}
                open={schemaDrawerOpen}
                onOpenChange={setSchemaDrawerOpen}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <ResultTable rows={result.rows} />
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
    </>
  );
}
