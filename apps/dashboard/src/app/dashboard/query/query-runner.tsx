'use client';

import { HistoryDrawer } from '@/components/query/history-drawer';
import { QueryResult } from '@/components/query/result';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryResponse, runQuery } from '@/lib/query';
import { RiAlertLine, RiChat3Line, RiCloseLine, RiFileCopyLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';
import QueryForm from './query-form';
import { useTranslations } from '@/i18n/use-translations';
import { toast } from 'sonner';

interface QueryError {
  message: string;
  sql?: string;
}

interface Props {
  datasources: { id: number; name: string; isDefault?: boolean }[];
  aiProviders: { id: number; name: string; type: string; isDefault: boolean }[];
  initialResult: QueryResponse | null;
  apiBase?: string;
}

const SQL_ERROR_PATTERNS = [
  /SQL:\s*(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(?=\s*(?:--|;|$))/i,
  /^(SELECT|INSERT|UPDATE|DELETE|WITH)[\s\S]*?(?=\s*-\s*|$)/i,
];

const parseQueryError = (error: unknown, fallbackMessage: string): QueryError => {
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;
  const sqlMatch = SQL_ERROR_PATTERNS.map((pattern) => errorMessage.match(pattern)).find(Boolean);
  const extractedSql = sqlMatch ? sqlMatch[0].replace(/^SQL:\s*/i, '').trim() : undefined;
  const cleanedMessage = sqlMatch
    ? errorMessage
        .replace(sqlMatch[0], '')
        .replace(/^\s*-\s*/, '')
        .replace(/\s*;\s*$/, '')
        .trim()
    : errorMessage;

  return {
    message: cleanedMessage || errorMessage,
    sql: extractedSql,
  };
};

export default function QueryRunner({ datasources, aiProviders, initialResult }: Props) {
  const t = useTranslations();
  const [result, setResult] = useState<QueryResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<QueryError | null>(null);
  const defaultDatasourceId = useMemo(
    () => datasources.find((d) => d.isDefault)?.id ?? datasources[0]?.id,
    [datasources],
  );
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

  useEffect(() => {
    if (!defaultDatasourceId) return;
    if (!activeDatasource || !datasources.some((item) => item.id === activeDatasource)) {
      setActiveDatasource(defaultDatasourceId);
    }
  }, [activeDatasource, datasources, defaultDatasourceId]);

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
      setResult(null);
      setError(parseQueryError(err, t('Query failed, please check API')));
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = (rerunQuestion: string) => {
    setQuestion(rerunQuestion);
    const datasourceId = activeDatasource ?? defaultDatasourceId;
    void handleRun({
      question: rerunQuestion,
      datasource: datasourceId,
      limit: 5,
    });
  };

  const handleSubmit = (body: Parameters<typeof runQuery>[0]): void => {
    void handleRun(body);
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="shrink-0 bg-background z-10">
        <div className="mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('Query')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('Query database using natural language, AI generates SQL automatically')}
            </p>
          </div>
          <HistoryDrawer onRerun={handleRerun} />
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="flex-1 flex flex-col mx-auto overflow-y-auto w-full gap-4 py-4"
        id="query-results-container"
      >
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <RiAlertLine className="h-5 w-5 text-destructive" aria-hidden="true" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-destructive">
                        {t('Query Execution Failed')}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label={t('Close')}
                      onClick={() => setError(null)}
                    >
                      <RiCloseLine className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  {error.sql && (
                    <div className="rounded-md bg-muted/50 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t('Generated SQL')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            void navigator.clipboard.writeText(error.sql || '');
                            toast.success(t('Copied'));
                          }}
                        >
                          <RiFileCopyLine className="h-3 w-3" aria-hidden="true" />
                          {t('Copy')}
                        </Button>
                      </div>
                      <pre className="text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all font-mono">
                        {error.sql}
                      </pre>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'Tip: Try rephrasing your question or check if the table/column names are correct',
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
          <div id="query-results" className="space-y-4">
            <QueryResult result={result} datasourceId={activeDatasource} question={question} />
          </div>
        )}

        {/* Empty State - Show when no result and not loading */}
        {!result && !loading && !error && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <RiChat3Line className="h-24 w-24 mb-4 opacity-20 mx-auto" aria-hidden="true" />
              <p className="text-lg font-medium">{t('Start Querying')}</p>
              <p className="text-sm mt-1">
                {t('Enter your question below, AI will generate SQL and execute')}
              </p>
            </div>
          </div>
        )}
      </div>
      {/* Fixed Query Form at Bottom */}
      <div className="shrink-0">
        <QueryForm
          datasources={datasources}
          aiProviders={aiProviders}
          defaultDs={defaultDatasourceId}
          defaultAiProvider={
            aiProviders.find((p) => p.isDefault)?.id ?? aiProviders[0]?.id ?? undefined
          }
          onResult={(res) => setResult(res)}
          onSubmit={handleSubmit}
          loading={loading}
          onDatasourceChange={(id) => setActiveDatasource(id)}
          externalQuestion={question}
          onQuestionChange={setQuestion}
        />
      </div>
    </div>
  );
}
