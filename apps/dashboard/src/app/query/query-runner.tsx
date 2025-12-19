'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { HistoryDrawer } from '@/components/query/history-drawer';
import { QueryResult } from '@/components/query/result';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryResponse, runQuery } from '@/lib/query';
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
    <div className="flex flex-col gap-6">
      <PageHeader title="查询" description="使用自然语言查询数据库，AI 自动生成 SQL 并执行">
        <HistoryDrawer onRerun={handleRerun} />
      </PageHeader>

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

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !result && (
        <Card className="shadow-none">
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
        <QueryResult result={result} datasourceId={activeDatasource} question={question} />
      )}
    </div>
  );
}
