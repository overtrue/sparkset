'use client';

import { FileText, Save } from 'lucide-react';
import { useState } from 'react';
import { QueryResponse } from '../../lib/query';
import { SaveActionDialog } from '../action/save-dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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

  return (
    <>
      <Card className="shadow-none overflow-hidden w-full max-w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                查询结果
              </CardTitle>
              <CardDescription>
                返回 {result.rows.length} 行数据
                {result.summary && ` · ${result.summary}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setSaveDialogOpen(true)}
              >
                <Save className="h-4 w-4" />
                保存为 Action
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
        <CardContent className="p-0">
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
    </>
  );
}
