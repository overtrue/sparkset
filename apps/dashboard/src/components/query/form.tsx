'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RiRefreshLine } from '@remixicon/react';

import { AiProviderSelector } from '@/components/ai-provider-selector';
import { DatasourceSelector } from '@/components/datasource-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from '@/i18n/use-translations';
import {
  QUERY_REQUEST_LIMIT_MAX,
  QUERY_REQUEST_QUESTION_MAX_LENGTH,
  type QueryRequestInput,
} from '@/lib/query';

interface QueryFormProps {
  datasources: { id: number; name: string; isDefault?: boolean }[];
  aiProviders: { id: number; name: string; type: string; isDefault: boolean }[];
  defaultDs?: number;
  defaultAiProvider?: number;
  datasource?: number;
  aiProvider?: number;
  limit?: number;
  onSubmit: (body: QueryRequestInput) => void;
  loading?: boolean;
  onDatasourceChange?: (id: number) => void;
  onAiProviderChange?: (id: number | undefined) => void;
  onLimitChange?: (limit: number) => void;
  externalQuestion?: string;
  onQuestionChange?: (question: string) => void;
}

const normalizeLimit = (value: number) =>
  Math.min(QUERY_REQUEST_LIMIT_MAX, Math.max(1, Math.trunc(value)));

export function QueryForm({
  datasources,
  aiProviders,
  defaultDs,
  defaultAiProvider,
  datasource: controlledDatasource,
  aiProvider: controlledAiProvider,
  limit: controlledLimit,
  onSubmit,
  loading,
  onDatasourceChange,
  onAiProviderChange,
  onLimitChange,
  externalQuestion,
  onQuestionChange,
}: QueryFormProps) {
  const t = useTranslations();
  const [internalQuestion, setInternalQuestion] = useState('');
  const [internalDatasource, setInternalDatasource] = useState<number | undefined>(undefined);
  const [internalAiProvider, setInternalAiProvider] = useState<number | undefined>(undefined);
  const [internalLimit, setInternalLimit] = useState(5);

  const question = externalQuestion ?? internalQuestion;
  const questionTooLong = question.length > QUERY_REQUEST_QUESTION_MAX_LENGTH;

  const defaultDatasourceId = useMemo(
    () => defaultDs ?? datasources.find((item) => item.isDefault)?.id ?? datasources[0]?.id,
    [datasources, defaultDs],
  );
  const defaultAiProviderId = useMemo(
    () => defaultAiProvider ?? aiProviders.find((item) => item.isDefault)?.id ?? aiProviders[0]?.id,
    [aiProviders, defaultAiProvider],
  );

  const datasource = controlledDatasource ?? internalDatasource;
  const aiProvider = controlledAiProvider ?? internalAiProvider;
  const limit = controlledLimit ?? internalLimit;

  useEffect(() => {
    if (!defaultDatasourceId) return;
    if (datasource && datasources.some((item) => item.id === datasource)) return;

    if (controlledDatasource === undefined) {
      setInternalDatasource(defaultDatasourceId);
    }
    onDatasourceChange?.(defaultDatasourceId);
  }, [controlledDatasource, datasource, datasources, defaultDatasourceId, onDatasourceChange]);

  useEffect(() => {
    if (!defaultAiProviderId) return;
    if (aiProvider && aiProviders.some((item) => item.id === aiProvider)) return;

    if (controlledAiProvider === undefined) {
      setInternalAiProvider(defaultAiProviderId);
    }
    onAiProviderChange?.(defaultAiProviderId);
  }, [aiProvider, aiProviders, controlledAiProvider, defaultAiProviderId, onAiProviderChange]);

  useEffect(() => {
    if (!controlledLimit || controlledLimit <= 0) return;

    const safeValue = normalizeLimit(controlledLimit);
    if (controlledLimit === safeValue) return;

    if (controlledLimit === undefined) {
      setInternalLimit(safeValue);
    }
    onLimitChange?.(safeValue);
  }, [controlledLimit, onLimitChange]);

  const updateQuestion = (nextQuestion: string) => {
    if (externalQuestion === undefined) {
      setInternalQuestion(nextQuestion);
    }
    onQuestionChange?.(nextQuestion);
  };

  const updateDatasource = (nextDatasource: number) => {
    if (controlledDatasource === undefined) {
      setInternalDatasource(nextDatasource);
    }
    onDatasourceChange?.(nextDatasource);
  };

  const updateAiProvider = (nextAiProvider: number | undefined) => {
    if (controlledAiProvider === undefined) {
      setInternalAiProvider(nextAiProvider);
    }
    onAiProviderChange?.(nextAiProvider);
  };

  const updateLimit = (nextLimit: number) => {
    const safeValue = normalizeLimit(nextLimit);

    if (controlledLimit === undefined) {
      setInternalLimit(safeValue);
    }
    onLimitChange?.(safeValue);
  };

  const submit = () => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || !datasource || questionTooLong) {
      return;
    }

    const body: QueryRequestInput = {
      question: normalizedQuestion,
      datasource,
      limit,
      ...(aiProvider && { aiProvider }),
    };
    onSubmit(body);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  return (
    <Card className="overflow-hidden rounded-xl border-border/50 p-0 shadow-lg">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="flex flex-col gap-0">
          <div className="rounded-t-xl bg-background">
            <Label htmlFor="question" className="sr-only">
              {t('Query')}
            </Label>
            <Textarea
              id="question"
              rows={3}
              value={question}
              onChange={(event) => updateQuestion(event.target.value)}
              placeholder={t('Enter your query question')}
              disabled={loading}
              maxLength={QUERY_REQUEST_QUESTION_MAX_LENGTH}
              aria-invalid={questionTooLong || !question.trim()}
              aria-describedby="query-question-hint"
              className="min-h-[80px] resize-none border-0 bg-transparent text-base shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && !questionTooLong) {
                  event.preventDefault();
                  if (!question.trim()) {
                    return;
                  }
                  submit();
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between px-4 py-1 text-[11px] text-muted-foreground">
            <span
              id="query-question-hint"
              role="status"
              aria-live="polite"
              className={questionTooLong || !question.trim() ? 'text-destructive' : ''}
            >
              {question.length}/{QUERY_REQUEST_QUESTION_MAX_LENGTH}
            </span>
            <span className={questionTooLong || !question.trim() ? 'text-destructive' : ''}>
              {!question.trim()
                ? t('Question is required')
                : questionTooLong
                  ? t('Question must not exceed {max} characters', {
                      max: QUERY_REQUEST_QUESTION_MAX_LENGTH,
                    })
                  : ''}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-b-xl border-t border-border/50 bg-muted/30 px-4 py-3">
            <DatasourceSelector
              datasources={datasources}
              value={datasource}
              onValueChange={updateDatasource}
              disabled={loading}
            />

            <AiProviderSelector
              providers={aiProviders}
              value={aiProvider}
              onValueChange={updateAiProvider}
              disabled={loading}
            />

            <div className="flex items-center gap-1.5">
              <Label htmlFor="limit" className="whitespace-nowrap text-xs text-muted-foreground">
                {t('Limit')}
              </Label>
              <Input
                id="limit"
                name="limit"
                type="number"
                min={1}
                max={QUERY_REQUEST_LIMIT_MAX}
                value={limit}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);
                  updateLimit(Number.isNaN(nextValue) ? 1 : nextValue);
                }}
                inputMode="numeric"
                disabled={loading}
                className="h-7 w-14 border-border/50 bg-background px-2 text-xs hover:bg-muted/50"
              />
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <Button
                type="submit"
                disabled={loading || !question.trim() || !datasource || questionTooLong}
                aria-label={t('Run Query')}
                className="px-4 font-medium"
                size="sm"
              >
                {loading ? (
                  <>
                    <RiRefreshLine className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t('Querying')}
                  </>
                ) : (
                  <>
                    {t('Run Query')}
                    <span className="ml-1.5 text-[10px] opacity-60" aria-hidden="true">
                      ⌘↵
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default QueryForm;
