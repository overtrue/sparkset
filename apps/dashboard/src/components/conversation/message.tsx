'use client';

import { Code, Save, User } from 'lucide-react';
import { useState } from 'react';
import { MessageDTO } from '../../lib/api';
import { QueryResponse } from '../../lib/query';
import { SaveActionDialog } from '../action/save-dialog';
import { QueryResult } from '../query/result';
import { ResultTable } from '../query/result-table';
import { SqlViewer } from '../query/sql-viewer';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface MessageItemProps {
  message: MessageDTO;
}

interface MessageMetadata {
  sql?: string;
  result?: QueryResponse;
  datasourceId?: number;
}

function isQueryResponse(obj: unknown): obj is QueryResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'sql' in obj &&
    'rows' in obj &&
    Array.isArray((obj as QueryResponse).rows)
  );
}

function parseMetadata(metadata: unknown): MessageMetadata | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const meta = metadata as Record<string, unknown>;
  const result: MessageMetadata = {};

  if (typeof meta.sql === 'string') {
    result.sql = meta.sql;
  }

  if (isQueryResponse(meta.result)) {
    result.result = meta.result;
  }

  if (typeof meta.datasourceId === 'number') {
    result.datasourceId = meta.datasourceId;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export function MessageItem({ message }: MessageItemProps) {
  const [sqlViewerOpen, setSqlViewerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const metadata = parseMetadata(message.metadata);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <Card className={isUser ? 'shadow-none bg-muted/30' : 'shadow-none'}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {isUser ? <User className="h-4 w-4" /> : <Code className="h-4 w-4" />}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isUser ? '用户' : '助手'}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>

            <div className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
              {message.content}
            </div>

            {isAssistant && metadata && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                {metadata.sql && !metadata.result && (
                  <div>
                    <SqlViewer
                      sql={metadata.sql}
                      open={sqlViewerOpen}
                      onOpenChange={setSqlViewerOpen}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                          <Code className="h-4 w-4" />
                          查看 SQL
                        </Button>
                      }
                    />
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setSaveDialogOpen(true)}
                      >
                        <Save className="h-4 w-4" />
                        保存为 Action
                      </Button>
                    </div>
                  </div>
                )}

                {metadata.result && (
                  <div className="space-y-2">
                    {metadata.sql ? (
                      <QueryResult
                        result={metadata.result}
                        datasourceId={metadata.datasourceId}
                        question={message.content}
                      />
                    ) : (
                      <div>
                        <div className="mb-2">
                          <span className="text-sm font-medium">查询结果</span>
                        </div>
                        <ResultTable rows={metadata.result.rows} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {metadata?.sql && (
        <SaveActionDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          sql={metadata.sql}
          datasourceId={metadata.datasourceId}
          defaultName={isUser ? message.content.slice(0, 50) : message.content.slice(0, 50)}
        />
      )}
    </Card>
  );
}
