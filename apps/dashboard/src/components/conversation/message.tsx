'use client';
import { RiCodeSSlashLine, RiSave3Line, RiUserLine } from '@remixicon/react';

import { useMemo, useState } from 'react';
import type { MessageDTO } from '@/types/api';
import { SaveActionDialog } from '../action/save-dialog';
import { getDocumentLocale } from '@/lib/utils/date';
import { QueryResult } from '../query/result';
import { SqlViewer } from '../query/sql-viewer';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { useTranslations } from '@/i18n/use-translations';
import { buildQueryResultCountLabel } from '../query/result-count';
import { extractMessageQueryMetadata } from '@/lib/query-message-metadata';

interface MessageItemProps {
  message: MessageDTO;
}

export function MessageItem({ message }: MessageItemProps) {
  const t = useTranslations();
  const [sqlViewerOpen, setSqlViewerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const locale = useMemo(() => getDocumentLocale(), []);
  const metadata = extractMessageQueryMetadata(message);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const saveDialogDefaultName = isUser
    ? message.content
    : metadata?.sql || metadata?.resultSummary || message.content;

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
            {isUser ? (
              <RiUserLine className="h-4 w-4" aria-hidden="true" />
            ) : (
              <RiCodeSSlashLine className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {isUser ? t('User') : t('Assistant')}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(message.createdAt).toLocaleString(locale)}
              </span>
            </div>

            <div className="text-sm text-foreground whitespace-pre-wrap break-words">
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
                          <RiCodeSSlashLine className="h-4 w-4" />
                          {t('View SQL')}
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
                        <RiSave3Line className="h-4 w-4" />
                        {t('Save as Action')}
                      </Button>
                    </div>
                  </div>
                )}

                {metadata.result && (
                  <div className="space-y-2">
                    <QueryResult
                      result={metadata.result}
                      datasourceId={metadata.datasourceId}
                      question={message.content}
                    />
                  </div>
                )}

                {metadata.result === undefined &&
                  (metadata.resultRowCount !== undefined ||
                    metadata.resultSummary !== undefined) && (
                    <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-sm">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {t('Query Result')}
                      </div>
                      <div className="text-sm text-foreground">
                        {buildQueryResultCountLabel(t, metadata.resultRowCount)}
                      </div>
                      {metadata.resultSummary ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {metadata.resultSummary}
                        </div>
                      ) : null}
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
          defaultName={saveDialogDefaultName.slice(0, 50)}
        />
      )}
    </Card>
  );
}
