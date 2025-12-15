'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AiProviderSelector } from '../../components/ai-provider-selector';
import { DatasourceSelector } from '../../components/datasource-selector';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { runQuery } from '../../lib/query';

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
  const [internalQuestion, setInternalQuestion] = useState('');
  const question = externalQuestion ?? internalQuestion;
  const setQuestion = (q: string) => {
    setInternalQuestion(q);
    onQuestionChange?.(q);
  };
  const defaultDatasourceId =
    defaultDs ?? datasources.find((d) => d.isDefault)?.id ?? datasources[0]?.id;
  const [datasource, setDatasource] = useState(defaultDatasourceId);
  const [aiProvider, setAiProvider] = useState(
    defaultAiProvider ?? aiProviders.find((p) => p.isDefault)?.id ?? aiProviders[0]?.id,
  );
  const [limit, setLimit] = useState(5);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = { question, datasource, limit, ...(aiProvider && { aiProvider }) };
    try {
      if (onSubmit) {
        await onSubmit(body);
      } else {
        const res = await runQuery(body);
        onResult(res);
      }
    } catch (err) {
      console.error(err);
      setError('查询失败，请检查 API');
    }
  };

  return (
    <Card className="shadow-sm border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* 主要输入区域 */}
          <div className="px-4 pt-4 pb-2">
            <Textarea
              id="question"
              rows={4}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="输入你的查询问题，例如：查询最近一周的订单数量..."
              disabled={loading}
              className="resize-none text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent min-h-[100px] placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
            />
          </div>

          {/* 底部工具栏 - 次要选项 */}
          <div className="border-t border-border/50 px-4 py-2 bg-muted/20">
            <div className="flex items-center gap-3 flex-wrap">
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
                  Limit
                </Label>
                <Input
                  id="limit"
                  type="number"
                  min={1}
                  max={1000}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  disabled={loading}
                  className="h-7 w-14 text-xs border-border/50 bg-background hover:bg-muted/50 px-2"
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex-1 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading || !question.trim() || !datasource}
                  className="h-7 px-4 text-xs font-medium"
                  size="sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                      查询中
                    </>
                  ) : (
                    <>
                      运行查询
                      <span className="ml-1.5 text-[10px] opacity-60">⌘↵</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              </div>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default QueryForm;
