'use client';
import { AiProviderSelector } from '@/components/ai-provider-selector';
import { DatasourceSelector } from '@/components/datasource-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { runQuery } from '@/lib/query';
import { RiRefreshLine } from '@remixicon/react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from '@/i18n/use-translations';

interface Props {
  datasources: { id: number; name: string; isDefault?: boolean }[];
  aiProviders: { id: number; name: string; type: string; isDefault: boolean }[];
  defaultDs?: number;
  defaultAiProvider?: number;
  onResult: (res: Awaited<ReturnType<typeof runQuery>>) => void;
  onSubmit?: (body: Parameters<typeof runQuery>[0]) => void;
  loading?: boolean;
  onDatasourceChange?: (id: number) => void;
  externalQuestion?: string;
  onQuestionChange?: (question: string) => void;
}

const QueryForm = ({
  datasources,
  aiProviders,
  defaultDs,
  defaultAiProvider,
  onResult,
  onSubmit,
  loading,
  onDatasourceChange,
  externalQuestion,
  onQuestionChange,
}: Props) => {
  const t = useTranslations();
  const [internalQuestion, setInternalQuestion] = useState('');
  const isControlled = externalQuestion !== undefined;
  const question = isControlled ? externalQuestion : internalQuestion;
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!defaultDatasourceId) return;
    if (!datasource || !datasources.some((item) => item.id === datasource)) {
      setDatasource(defaultDatasourceId);
      onDatasourceChange?.(defaultDatasourceId);
    }
  }, [datasource, datasources, defaultDatasourceId, onDatasourceChange]);

  useEffect(() => {
    if (!defaultAiProviderId) return;
    if (!aiProvider || !aiProviders.some((item) => item.id === aiProvider)) {
      setAiProvider(defaultAiProviderId);
    }
  }, [aiProvider, aiProviders, defaultAiProviderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = { question, datasource, limit, ...(aiProvider && { aiProvider }) };
    try {
      if (onSubmit) {
        void onSubmit(body);
      } else {
        const res = await runQuery(body);
        onResult(res);
      }
    } catch (err) {
      console.error(err);
      setError(t('Query failed, please check API'));
    }
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
              className="resize-none text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent min-h-[80px] placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
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
                max={1000}
                value={limit}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);
                  const safeValue = Number.isNaN(nextValue)
                    ? 1
                    : Math.min(1000, Math.max(1, nextValue));
                  setLimit(safeValue);
                }}
                inputMode="numeric"
                disabled={loading}
                className="h-7 w-14 text-xs border-border/50 bg-background hover:bg-muted/50 px-2"
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex-1 flex justify-end gap-2 items-center">
              {error && <span className="text-xs text-destructive mr-auto">{error}</span>}
              <Button
                type="submit"
                disabled={loading || !question.trim() || !datasource}
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
