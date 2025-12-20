'use client';

import { HistoryDrawer } from '@/components/query/history-drawer';
import { QueryResult } from '@/components/query/result';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryResponse, runQuery } from '@/lib/query';
import { useEffect, useState } from 'react';
import QueryForm from './query-form';

interface Props {
  datasources: { id: number; name: string; isDefault?: boolean }[];
  aiProviders: { id: number; name: string; type: string; isDefault: boolean }[];
  initialResult: QueryResponse | null;
  apiBase?: string;
}

export default function QueryRunner({ datasources, aiProviders, initialResult }: Props) {
  const [result, setResult] = useState<QueryResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultDatasourceId = datasources.find((d) => d.isDefault)?.id ?? datasources[0]?.id;
  const [activeDatasource, setActiveDatasource] = useState<number | undefined>(defaultDatasourceId);
  const [question, setQuestion] = useState<string>('');

  // Auto-scroll to results when they appear
  useEffect(() => {
    if (result) {
      const resultsElement = document.getElementById('query-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [result]);

  const handleRun = async (body: Parameters<typeof runQuery>[0]) => {
    setActiveDatasource(body.datasource);
    setQuestion(body.question || '');
    setLoading(true);
    setError(null);
    try {
      const res = await runQuery(body);
      setResult(res);
    } catch (err) {
      console.error(err);
      setError('查询失败，请检查 API');
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = (rerunQuestion: string) => {
    setQuestion(rerunQuestion);
    void handleRun({
      question: rerunQuestion,
      datasource: activeDatasource,
      limit: 5,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Page Header */}
      <div className="shrink-0 bg-background z-10">
        <div className="mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">查询</h1>
            <p className="text-sm text-muted-foreground mt-1">
              使用自然语言查询数据库，AI 自动生成 SQL 并执行
            </p>
          </div>
          <HistoryDrawer onRerun={handleRerun} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col mx-auto w-full gap-4 py-4">
        {/* Results Area - Takes up main space */}
        <div className="flex-1 overflow-auto min-h-0" id="query-results-container">
          {error && (
            <div className="mb-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {loading && !result && (
            <Card className="shadow-none mb-4">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <div id="query-results" className="space-y-4 pb-24">
              <QueryResult result={result} datasourceId={activeDatasource} question={question} />
            </div>
          )}

          {/* Empty State - Show when no result and not loading */}
          {!result && !loading && !error && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="text-6xl mb-4 opacity-20">💬</div>
                <p className="text-lg font-medium">开始查询</p>
                <p className="text-sm mt-1">在下方输入问题，AI 将自动生成 SQL 并执行</p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Query Form at Bottom */}
        <div className="shrink-0 pb-4">
          <QueryForm
            datasources={datasources}
            aiProviders={aiProviders}
            defaultDs={defaultDatasourceId}
            defaultAiProvider={
              aiProviders.find((p) => p.isDefault)?.id ?? aiProviders[0]?.id ?? undefined
            }
            onResult={(res) => setResult(res)}
            onSubmit={handleRun}
            loading={loading}
            onDatasourceChange={(id) => setActiveDatasource(id)}
            externalQuestion={question}
            onQuestionChange={setQuestion}
          />
        </div>
      </div>
    </div>
  );
}
