'use client';
import { AiProviderSelector } from '@/components/ai-provider-selector';
import { DatasourceSelector } from '@/components/datasource-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  QUERY_REQUEST_LIMIT_MAX,
  QUERY_REQUEST_QUESTION_MAX_LENGTH,
  type QueryRequestInput,
} from '@/lib/query';
import { RiRefreshLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '@/i18n/use-translations';

interface Props {
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

const QueryForm = ({
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
}: Props) => {
  const t = useTranslations();
  const [internalQuestion, setInternalQuestion] = useState('');
  const isControlled = externalQuestion !== undefined;
  const question = isControlled ? externalQuestion : internalQuestion;
  const questionTooLong = question.length > QUERY_REQUEST_QUESTION_MAX_LENGTH;
  const setQuestion = (q: string) => {
    if (!isControlled) {
      setInternalQuestion(q);
    }
    onQuestionChange?.(q);
  };
  const defaultDatasourceId = useMemo(
    () => defaultDs ?? datasources.find((d) => d.isDefault)?.id ?? datasources[0]?.id,
    [datasources, defaultDs],
  );
  const defaultAiProviderId = useMemo(
    () => defaultAiProvider ?? aiProviders.find((p) => p.isDefault)?.id ?? aiProviders[0]?.id,
    [aiProviders, defaultAiProvider],
  );
  const [datasource, setDatasource] = useState(defaultDatasourceId);
  const [aiProvider, setAiProvider] = useState(defaultAiProviderId);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    if (
      controlledDatasource !== undefined &&
      datasources.some((item) => item.id === controlledDatasource)
    ) {
      setDatasource(controlledDatasource);
      return;
    }

    if (!defaultDatasourceId) return;
    if (!datasource || !datasources.some((item) => item.id === datasource)) {
      setDatasource(defaultDatasourceId);
      onDatasourceChange?.(defaultDatasourceId);
    }
  }, [controlledDatasource, datasource, datasources, defaultDatasourceId, onDatasourceChange]);

  useEffect(() => {
    if (
      controlledAiProvider !== undefined &&
      aiProviders.some((item) => item.id === controlledAiProvider)
    ) {
      setAiProvider(controlledAiProvider);
      return;
    }

    if (!defaultAiProviderId) return;
    if (!aiProvider || !aiProviders.some((item) => item.id === aiProvider)) {
      setAiProvider(defaultAiProviderId);
      onAiProviderChange?.(defaultAiProviderId);
    }
  }, [controlledAiProvider, aiProvider, aiProviders, defaultAiProviderId, onAiProviderChange]);

  useEffect(() => {
    if (!controlledLimit || controlledLimit <= 0) return;
    const safeValue = Math.min(QUERY_REQUEST_LIMIT_MAX, Math.max(1, Math.trunc(controlledLimit)));
    if (limit !== safeValue) {
      setLimit(safeValue);
    }
  }, [controlledLimit, limit]);

  useEffect(() => {
    onAiProviderChange?.(aiProvider);
  }, [aiProvider, onAiProviderChange]);

  useEffect(() => {
    onLimitChange?.(limit);
  }, [limit, onLimitChange]);

  const submit = () => {
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion || questionTooLong) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <Card className="shadow-lg border-border/50 overflow-hidden rounded-xl p-0">
      <CardContent className="p-0">
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="flex flex-col gap-0"
        >
          {/* 主要输入区域 */}
          <div className="bg-background rounded-t-xl">
            <Label htmlFor="question" className="sr-only">
              {t('Query')}
            </Label>
            <Textarea
              id="question"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('Enter your query question')}
              disabled={loading}
              maxLength={QUERY_REQUEST_QUESTION_MAX_LENGTH}
              aria-invalid={questionTooLong || !question.trim()}
              aria-describedby="query-question-hint"
              className="resize-none text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent min-h-[80px] placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !questionTooLong) {
                  e.preventDefault();
                  if (!question.trim()) {
                    return;
                  }
                  submit();
                }
              }}
            />
          </div>
          <div className="px-4 py-1 text-[11px] text-muted-foreground flex items-center justify-between">
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

          {/* 底部工具栏 */}
          <div className="border-t border-border/50 px-4 py-3 bg-muted/30 flex items-center gap-3 flex-wrap rounded-b-xl">
            <DatasourceSelector
              datasources={datasources}
              value={datasource}
              onValueChange={(next) => {
                setDatasource(next);
                onDatasourceChange?.(next);
              }}
              disabled={loading}
            />

            <AiProviderSelector
              providers={aiProviders}
              value={aiProvider}
              onValueChange={setAiProvider}
              disabled={loading}
            />

            {/* Limit 输入 */}
            <div className="flex items-center gap-1.5">
              <Label htmlFor="limit" className="text-xs text-muted-foreground whitespace-nowrap">
                {t('Limit')}
              </Label>
              <Input
                id="limit"
                name="limit"
                type="number"
                min={1}
                max={QUERY_REQUEST_LIMIT_MAX}
                value={limit}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  const safeValue = Number.isNaN(nextValue)
                    ? 1
                    : Math.min(QUERY_REQUEST_LIMIT_MAX, Math.max(1, Math.trunc(nextValue)));
                  setLimit(safeValue);
                  onLimitChange?.(safeValue);
                }}
                inputMode="numeric"
                disabled={loading}
                className="h-7 w-14 text-xs border-border/50 bg-background hover:bg-muted/50 px-2"
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex-1 flex justify-end gap-2 items-center">
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
};

export default QueryForm;
