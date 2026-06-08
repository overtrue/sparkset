'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RiAlertLine,
  RiChat3Line,
  RiCloseLine,
  RiFileCopyLine,
  RiRefreshLine,
} from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { HistoryDrawer } from '@/components/query/history-drawer';
import QueryForm from '@/components/query/form';
import { QueryResult } from '@/components/query/result';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n/use-translations';
import {
  QueryResponse,
  QUERY_REQUEST_LIMIT_MAX,
  normalizeQueryRequest,
  runQuery,
  type QueryRequestInput,
} from '@/lib/query';
import {
  QUERY_ERROR_CODES,
  getQueryErrorAction,
  parseQueryError,
  type QueryError,
} from '@/lib/query-errors';

interface QueryRunnerProps {
  datasources: { id: number; name: string; isDefault?: boolean }[];
  aiProviders: { id: number; name: string; type: string; isDefault: boolean }[];
  initialResult: QueryResponse | null;
}

export function QueryRunner({ datasources, aiProviders, initialResult }: QueryRunnerProps) {
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
    () => datasources.find((item) => item.isDefault)?.id ?? datasources[0]?.id,
    [datasources],
  );
  const defaultAiProviderId = useMemo(
    () => aiProviders.find((item) => item.isDefault)?.id ?? aiProviders[0]?.id,
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

    const retryAfter = error.retryAfter;
    if (typeof retryAfter !== 'number') {
      setRetryCountdown(null);
      return;
    }

    let remaining = Math.max(1, Math.floor(retryAfter));
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
  }, [error]);

  useEffect(() => {
    setError((currentError) => (currentError ? null : currentError));
  }, [question]);

  useEffect(() => {
    if (!result) return;

    const resultsElement = document.getElementById('query-results');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

      const response = await runQuery(request);
      setConversationId(response.conversationId ?? body.conversationId ?? conversationId);
      setResult(response);
      if (response.datasourceId) {
        setActiveDatasource(response.datasourceId);
      }
      if (response.aiProviderId) {
        setActiveAiProvider(response.aiProviderId);
      }
      if (response.limit) {
        setActiveLimit(response.limit);
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

  const handleDatasourceChange = useCallback((id: number) => {
    setActiveDatasource(id);
  }, []);

  const handleAiProviderChange = useCallback((id: number | undefined) => {
    setActiveAiProvider(id);
  }, []);

  const handleLimitChange = useCallback((limit: number) => {
    setActiveLimit(limit);
  }, []);

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
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="z-10 shrink-0 bg-background">
        <div className="mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('Query')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('Query database using natural language, AI generates SQL automatically')}
            </p>
          </div>
          <HistoryDrawer onRerun={handleRerun} />
        </div>
      </div>

      <div
        className="mx-auto flex w-full flex-1 flex-col gap-4 overflow-y-auto py-4"
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
                      <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
                      {(error.status || error.code) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {error.status && `HTTP ${error.status}`}
                          {error.status && error.code ? ' · ' : ''}
                          {error.code}
                        </p>
                      )}
                      {error.advice ? (
                        <p className="mt-2 text-xs text-muted-foreground">{error.advice}</p>
                      ) : null}
                      {hasRateLimitError && retryCountdown !== null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('Retry in {seconds} seconds', { seconds: retryCountdown })}
                        </p>
                      ) : null}
                      {error.details && error.details.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {error.details.map((detail, index) => (
                            <li key={`${index}-${detail}`} className="list-inside list-disc">
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
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-muted-foreground">
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
          <Card className="mb-4 shadow-none">
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

        {!result && !loading && !error && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <RiChat3Line className="mx-auto mb-4 h-24 w-24 opacity-20" aria-hidden="true" />
              <p className="text-lg font-medium">{t('Start Querying')}</p>
              <p className="mt-1 text-sm">
                {t('Enter your question below, AI will generate SQL and execute')}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0">
        <QueryForm
          datasources={datasources}
          aiProviders={aiProviders}
          defaultDs={defaultDatasourceId}
          datasource={activeDatasource}
          aiProvider={activeAiProvider}
          limit={activeLimit}
          defaultAiProvider={defaultAiProviderId}
          onSubmit={handleSubmit}
          loading={isInputLocked}
          onDatasourceChange={handleDatasourceChange}
          onAiProviderChange={handleAiProviderChange}
          onLimitChange={handleLimitChange}
          externalQuestion={question}
          onQuestionChange={setQuestion}
        />
      </div>
    </div>
  );
}

export default QueryRunner;
