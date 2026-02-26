'use client';

import { HistoryDrawer } from '@/components/query/history-drawer';
import { QueryResult } from '@/components/query/result';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  QUERY_ERROR_CODES,
  getQueryErrorAction,
  parseQueryError,
  type QueryError,
} from '@/lib/query-errors';
import {
  QueryResponse,
  QUERY_REQUEST_LIMIT_MAX,
  normalizeQueryRequest,
  runQuery,
  type QueryRequestInput,
} from '@/lib/query';
import {
  RiAlertLine,
  RiChat3Line,
  RiCloseLine,
  RiFileCopyLine,
  RiRefreshLine,
} from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';
import QueryForm from './query-form';

interface Props {
  datasources: { id: number; name: string; isDefault?: boolean }[];
  aiProviders: { id: number; name: string; type: string; isDefault: boolean }[];
  initialResult: QueryResponse | null;
}

export default function QueryRunner({ datasources, aiProviders, initialResult }: Props) {
  const t = useTranslations();
  const router = useRouter();
  const [result, setResult] = useState<QueryResponse | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<QueryError | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<number | undefined>(
    initialResult?.conversationId,
  );
  const defaultDatasourceId = useMemo(
    () => datasources.find((d) => d.isDefault)?.id ?? datasources[0]?.id,
    [datasources],
  );
  const defaultAiProviderId = useMemo(
    () => aiProviders.find((p) => p.isDefault)?.id ?? aiProviders[0]?.id,
    [aiProviders],
  );
  const [activeDatasource, setActiveDatasource] = useState<number | undefined>(defaultDatasourceId);
  const [activeAiProvider, setActiveAiProvider] = useState<number | undefined>(defaultAiProviderId);
  const [activeLimit, setActiveLimit] = useState<number>(initialResult?.limit ?? 5);
  const [question, setQuestion] = useState<string>('');

  useEffect(() => {
    if (
      !error ||
      (error.code !== QUERY_ERROR_CODES.RATE_LIMIT && error.status !== 429) ||
      !Number.isFinite(error.retryAfter)
    ) {
      setRetryCountdown(null);
      return;
    }

    let remaining = Math.max(1, Math.floor(error.retryAfter));
    setRetryCountdown(remaining);

    const timer = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        setRetryCountdown(null);
        return;
      }

      setRetryCountdown(remaining);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [error?.code, error?.status, error?.retryAfter]);

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [question]);

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

  useEffect(() => {
    if (!defaultAiProviderId) return;
    if (!activeAiProvider || !aiProviders.some((item) => item.id === activeAiProvider)) {
      setActiveAiProvider(defaultAiProviderId);
    }
  }, [activeAiProvider, aiProviders, defaultAiProviderId]);

  const handleCopyText = async (
    value: string,
    successMessage: string,
    failMessage: string,
  ): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch (err) {
      console.error(err);
      toast.error(failMessage);
    }
  };

  const handleRun = async (body: QueryRequestInput) => {
    if (loading) {
      return;
    }

    setQuestion(body.question || '');
    setLoading(true);
    setError(null);
    try {
      const request = normalizeQueryRequest({
        ...body,
        conversationId: body.conversationId ?? conversationId,
        aiProvider: body.aiProvider ?? activeAiProvider,
        limit: body.limit ?? activeLimit,
      });

      if (request.datasource) {
        setActiveDatasource(request.datasource);
      }
      if (request.aiProvider) {
        setActiveAiProvider(request.aiProvider);
      }
      if (request.limit) {
        setActiveLimit(request.limit);
      }

      const res = await runQuery(request);
      setConversationId(res.conversationId ?? body.conversationId ?? conversationId);
      setResult(res);
      if (res.datasourceId) {
        setActiveDatasource(res.datasourceId);
      }
      if (res.aiProviderId) {
        setActiveAiProvider(res.aiProviderId);
      }
      if (res.limit) {
        setActiveLimit(res.limit);
      }
    } catch (err) {
      console.error(err);
      const parsedError = parseQueryError(err, t('Query failed, please check the API'), t);
      setResult(null);
      setError(parsedError);
      if (
        parsedError.status === 403 ||
        parsedError.status === 404 ||
        parsedError.code === QUERY_ERROR_CODES.CONVERSATION_NOT_FOUND ||
        parsedError.code === QUERY_ERROR_CODES.CONVERSATION_FORBIDDEN
      ) {
        setConversationId(undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = (
    rerunQuestion: string,
    rerunConversationId: number,
    rerunDatasourceId?: number,
    rerunAiProviderId?: number,
    rerunLimit?: number,
  ) => {
    if (loading) {
      return;
    }

    const normalizedRerunLimit =
      rerunLimit && Number.isFinite(rerunLimit)
        ? Math.min(QUERY_REQUEST_LIMIT_MAX, Math.max(1, Math.trunc(rerunLimit)))
        : undefined;
    setConversationId(rerunConversationId);
    if (rerunDatasourceId) {
      setActiveDatasource(rerunDatasourceId);
    }
    if (rerunAiProviderId) {
      setActiveAiProvider(rerunAiProviderId);
    }
    if (normalizedRerunLimit) {
      setActiveLimit(normalizedRerunLimit);
    }
    setQuestion(rerunQuestion);
    const datasourceId = rerunDatasourceId ?? activeDatasource ?? defaultDatasourceId;
    const aiProviderId = rerunAiProviderId ?? activeAiProvider ?? defaultAiProviderId;
    const requestLimit = normalizedRerunLimit ?? activeLimit;
    void handleRun({
      question: rerunQuestion,
      datasource: datasourceId,
      limit: requestLimit,
      aiProvider: aiProviderId,
      conversationId: rerunConversationId,
    });
  };

  const handleSubmit = (body: QueryRequestInput): void => {
    void handleRun(body);
  };

  const handleNewConversation = () => {
    setConversationId(undefined);
    setQuestion('');
    setError(null);
    setResult(null);
  };

  const handleRetry = () => {
    if (loading) {
      return;
    }

    void handleRun({
      question,
      datasource: activeDatasource ?? defaultDatasourceId,
      aiProvider: activeAiProvider ?? defaultAiProviderId,
      conversationId,
      limit: activeLimit,
    });
  };

  const handleCopySql = async () => {
    if (!error?.sql) {
      return;
    }

    await handleCopyText(error.sql, t('Copied'), t('Copy failed'));
  };

  const errorAction = getQueryErrorAction(error, t, {
    push: (href) => router.push(href),
    onRetry: handleRetry,
    onNewConversation: handleNewConversation,
    retryCountdown,
    isSubmitting: loading,
  });
  const hasRateLimitError = error?.code === QUERY_ERROR_CODES.RATE_LIMIT || error?.status === 429;
  const isRateLimitCoolingDown = hasRateLimitError && retryCountdown !== null;
  const isInputLocked = loading || isRateLimitCoolingDown;

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
                        {t('Query execution failed')}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                      {(error.status || error.code) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {error.status && `HTTP ${error.status}`}
                          {error.status && error.code ? ' · ' : ''}
                          {error.code}
                        </p>
                      )}
                      {error.advice ? (
                        <p className="text-xs text-muted-foreground mt-2">{error.advice}</p>
                      ) : null}
                      {hasRateLimitError && retryCountdown !== null ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('Retry in {seconds} seconds', { seconds: retryCountdown })}
                        </p>
                      ) : null}
                      {error.details && error.details.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {error.details.map((detail, index) => (
                            <li key={`${index}-${detail}`} className="list-disc list-inside">
                              {detail}
                            </li>
                          ))}
                        </ul>
                      ) : null}
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
                  {error.code === QUERY_ERROR_CODES.DATABASE_ERROR && error.sql && (
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
                            void handleCopySql();
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
                  {errorAction ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      disabled={errorAction.disabled}
                      onClick={errorAction.onClick}
                    >
                      {errorAction.label}
                    </Button>
                  ) : null}
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

        {loading && result && (
          <Card className="border-dashed shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RiRefreshLine className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('Querying')}
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
          datasource={activeDatasource}
          aiProvider={activeAiProvider}
          limit={activeLimit}
          defaultAiProvider={
            aiProviders.find((p) => p.isDefault)?.id ?? aiProviders[0]?.id ?? undefined
          }
          onSubmit={handleSubmit}
          loading={isInputLocked}
          onDatasourceChange={(id) => setActiveDatasource(id)}
          onAiProviderChange={setActiveAiProvider}
          onLimitChange={setActiveLimit}
          externalQuestion={question}
          onQuestionChange={setQuestion}
        />
      </div>
    </div>
  );
}
