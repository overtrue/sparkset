'use client';

import { useTranslations } from '@/i18n/use-translations';
import {
  fetchDatasourceDetail,
  generateSemanticDescriptions,
  updateColumnMetadata,
  updateTableMetadata,
} from '@/lib/api/datasources-api';
import type { DatasourceDetailDTO, TableColumnDTO, TableSchemaDTO } from '@/types/api';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { RiCloseLine, RiEdit2Line, RiSave3Line, RiSparkling2Line } from '@remixicon/react';
import * as React from 'react';
import { toast } from 'sonner';

interface EditingTableState {
  tableId: number;
  tableComment: string;
  semanticDescription: string;
}

interface EditingColumnState {
  columnId: number;
  columnComment: string;
  semanticDescription: string;
}

interface SchemaEditorProps {
  datasource: DatasourceDetailDTO;
  onDatasourceChange: React.Dispatch<React.SetStateAction<DatasourceDetailDTO>>;
  onBusyChange?: (busy: boolean) => void;
}

type MessageTone = 'success' | 'error';

const TABLE_PAGE_SIZE = 20;
const COLUMN_PAGE_SIZE = 20;

export function SchemaEditor({ datasource, onDatasourceChange, onBusyChange }: SchemaEditorProps) {
  const t = useTranslations();
  const [editingTable, setEditingTable] = React.useState<EditingTableState | null>(null);
  const [editingColumn, setEditingColumn] = React.useState<EditingColumnState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ text: string; tone: MessageTone } | null>(null);
  const messageTimeoutRef = React.useRef<number | null>(null);
  const [visibleTableCount, setVisibleTableCount] = React.useState(
    Math.min(TABLE_PAGE_SIZE, datasource.tables.length),
  );
  const [visibleColumnCounts, setVisibleColumnCounts] = React.useState<Record<number, number>>({});
  const isBusy = saving || generating;
  const isEditing = editingTable !== null || editingColumn !== null;

  React.useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  React.useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    setVisibleTableCount((prev) =>
      Math.min(Math.max(prev, TABLE_PAGE_SIZE), datasource.tables.length),
    );
    setVisibleColumnCounts((prev) => {
      const next: Record<number, number> = {};
      datasource.tables.forEach((table) => {
        const defaultCount = Math.min(COLUMN_PAGE_SIZE, table.columns.length);
        const currentCount = prev[table.id];
        next[table.id] = currentCount ? Math.min(currentCount, table.columns.length) : defaultCount;
      });
      return next;
    });
  }, [datasource.tables]);

  const setTimedMessage = React.useCallback((nextMessage: string, tone: MessageTone) => {
    setFeedback({ text: nextMessage, tone });
    if (messageTimeoutRef.current) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
    }, 3000);
  }, []);

  const updateTableInState = React.useCallback(
    (tableId: number, update: (table: TableSchemaDTO) => TableSchemaDTO) => {
      onDatasourceChange((prev) => ({
        ...prev,
        tables: prev.tables.map((table) => (table.id === tableId ? update(table) : table)),
      }));
    },
    [onDatasourceChange],
  );

  const updateColumnInState = React.useCallback(
    (columnId: number, update: (column: TableColumnDTO) => TableColumnDTO) => {
      onDatasourceChange((prev) => ({
        ...prev,
        tables: prev.tables.map((table) => ({
          ...table,
          columns: table.columns.map((column) =>
            column.id === columnId ? update(column) : column,
          ),
        })),
      }));
    },
    [onDatasourceChange],
  );

  const handleEditTable = React.useCallback((table: TableSchemaDTO) => {
    setEditingColumn(null);
    setEditingTable({
      tableId: table.id,
      tableComment: table.tableComment ?? '',
      semanticDescription: table.semanticDescription ?? '',
    });
  }, []);

  const handleSaveTable = async () => {
    if (!editingTable) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateTableMetadata(datasource.id, editingTable.tableId, {
        tableComment: editingTable.tableComment || null,
        semanticDescription: editingTable.semanticDescription || null,
      });
      updateTableInState(editingTable.tableId, (table) => ({
        ...table,
        tableComment: editingTable.tableComment || undefined,
        semanticDescription: editingTable.semanticDescription || undefined,
      }));
      setEditingTable(null);
      setTimedMessage(t('Saved successfully'), 'success');
    } catch (err) {
      setTimedMessage((err as Error)?.message ?? t('Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTable = () => {
    setEditingTable(null);
  };

  const handleEditColumn = React.useCallback((_tableId: number, column: TableColumnDTO) => {
    if (!column.id) return;
    setEditingTable(null);
    setEditingColumn({
      columnId: column.id,
      columnComment: column.comment ?? '',
      semanticDescription: column.semanticDescription ?? '',
    });
  }, []);

  const handleSaveColumn = async () => {
    if (!editingColumn) return;
    setSaving(true);
    setFeedback(null);
    try {
      await updateColumnMetadata(datasource.id, editingColumn.columnId, {
        columnComment: editingColumn.columnComment || null,
        semanticDescription: editingColumn.semanticDescription || null,
      });
      updateColumnInState(editingColumn.columnId, (column) => ({
        ...column,
        comment: editingColumn.columnComment || undefined,
        semanticDescription: editingColumn.semanticDescription || undefined,
      }));
      setEditingColumn(null);
      setTimedMessage(t('Saved successfully'), 'success');
    } catch (err) {
      setTimedMessage((err as Error)?.message ?? t('Save failed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelColumn = () => {
    setEditingColumn(null);
  };

  const handleGenerateSemantic = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      await generateSemanticDescriptions(datasource.id);
      const updated = await fetchDatasourceDetail(datasource.id);
      onDatasourceChange(updated);
      toast.success(t('Semantic description generated'));
    } catch (err) {
      toast.error((err as Error)?.message ?? t('Generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  const visibleTables = React.useMemo(
    () => datasource.tables.slice(0, visibleTableCount),
    [datasource.tables, visibleTableCount],
  );
  const hasMoreTables = datasource.tables.length > visibleTableCount;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('Schema Information')}</CardTitle>
            <CardDescription>
              {t(
                '{count} tables - edit comments and semantic descriptions to help AI understand the data structure better',
                { count: datasource.tables.length },
              )}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void handleGenerateSemantic();
            }}
            disabled={isBusy || isEditing}
          >
            <RiSparkling2Line
              className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {generating ? t('Generating…') : t('Add Semantic Description')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {feedback && (
          <div
            className={`mb-4 rounded-md p-3 text-sm ${
              feedback.tone === 'success'
                ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-destructive/10 text-destructive'
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback.text}
          </div>
        )}

        {datasource.tables.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('No schema info, please sync the datasource first')}
          </p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {visibleTables.map((table) => {
              const visibleColumnCount =
                visibleColumnCounts[table.id] ?? Math.min(COLUMN_PAGE_SIZE, table.columns.length);
              const visibleColumns = table.columns.slice(0, visibleColumnCount);
              const hasMoreColumns = table.columns.length > visibleColumnCount;

              return (
                <AccordionItem key={table.id} value={`table-${table.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex min-w-0 flex-1 items-center justify-between pr-4">
                        <div className="flex min-w-0 flex-col items-start">
                          <span className="w-full truncate font-medium">{table.tableName}</span>
                          {table.tableComment && (
                            <span className="w-full truncate text-xs text-muted-foreground">
                              {table.tableComment}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{t('{count} columns', { count: table.columns.length })}</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditTable(table);
                      }}
                      aria-label={t('Edit')}
                      title={t('Edit')}
                      disabled={isBusy}
                      className="mt-2"
                    >
                      <RiEdit2Line className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {editingTable?.tableId === table.id ? (
                        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                          <div>
                            <Label htmlFor={`table-comment-${table.id}`}>
                              {t('Table Comment')}
                            </Label>
                            <Input
                              id={`table-comment-${table.id}`}
                              name={`table-comment-${table.id}`}
                              autoComplete="off"
                              value={editingTable.tableComment}
                              onChange={(event) =>
                                setEditingTable({
                                  ...editingTable,
                                  tableComment: event.target.value,
                                })
                              }
                              placeholder={t('eg: Orders table…')}
                              disabled={isBusy}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`table-semantic-${table.id}`}>
                              {t('Semantic Description')}
                            </Label>
                            <Textarea
                              id={`table-semantic-${table.id}`}
                              name={`table-semantic-${table.id}`}
                              autoComplete="off"
                              value={editingTable.semanticDescription}
                              onChange={(event) =>
                                setEditingTable({
                                  ...editingTable,
                                  semanticDescription: event.target.value,
                                })
                              }
                              placeholder={t(
                                "Used for AI to understand the table's business meaning and purpose",
                              )}
                              rows={3}
                              disabled={isBusy}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                void handleSaveTable();
                              }}
                              disabled={isBusy}
                            >
                              <RiSave3Line className="h-4 w-4" aria-hidden="true" />
                              {t('Save')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelTable}
                              disabled={isBusy}
                            >
                              <RiCloseLine className="h-4 w-4" aria-hidden="true" />
                              {t('Cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {table.tableComment && (
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                {t('Table Comment')}
                              </Label>
                              <p className="text-sm break-words">{table.tableComment}</p>
                            </div>
                          )}
                          {table.semanticDescription && (
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                {t('Semantic Description')}
                              </Label>
                              <p className="text-sm break-words">{table.semanticDescription}</p>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>{t('Column Name')}</TableHead>
                              <TableHead>{t('Type')}</TableHead>
                              <TableHead>{t('Comment')}</TableHead>
                              <TableHead>{t('Semantic Description')}</TableHead>
                              <TableHead className="text-right">{t('Actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {visibleColumns.map((column) => (
                              <TableRow key={column.name}>
                                <TableCell className="font-medium">{column.name}</TableCell>
                                <TableCell className="text-muted-foreground">
                                  {column.type}
                                </TableCell>
                                <TableCell>
                                  {editingColumn?.columnId === column.id ? (
                                    <Input
                                      name={`column-comment-${column.id ?? column.name}`}
                                      autoComplete="off"
                                      aria-label={t('Column Comment')}
                                      value={editingColumn?.columnComment || ''}
                                      onChange={(event) =>
                                        editingColumn &&
                                        setEditingColumn({
                                          ...editingColumn,
                                          columnComment: event.target.value,
                                        })
                                      }
                                      placeholder={t('eg: Primary key…')}
                                      className="h-8"
                                      disabled={isBusy}
                                    />
                                  ) : (
                                    <span className="block break-words text-muted-foreground">
                                      {column.comment || '-'}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {editingColumn?.columnId === column.id ? (
                                    <Textarea
                                      name={`column-semantic-${column.id ?? column.name}`}
                                      autoComplete="off"
                                      aria-label={t('Semantic Description')}
                                      value={editingColumn?.semanticDescription || ''}
                                      onChange={(event) =>
                                        editingColumn &&
                                        setEditingColumn({
                                          ...editingColumn,
                                          semanticDescription: event.target.value,
                                        })
                                      }
                                      placeholder={t('eg: Business meaning of this field…')}
                                      rows={2}
                                      className="min-w-[200px]"
                                      disabled={isBusy}
                                    />
                                  ) : (
                                    <span className="block break-words text-muted-foreground">
                                      {column.semanticDescription || '-'}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {editingColumn?.columnId === column.id ? (
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          void handleSaveColumn();
                                        }}
                                        disabled={isBusy}
                                        aria-label={t('Save')}
                                        title={t('Save')}
                                      >
                                        <RiSave3Line className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelColumn}
                                        disabled={isBusy}
                                        aria-label={t('Cancel')}
                                        title={t('Cancel')}
                                      >
                                        <RiCloseLine className="h-4 w-4" aria-hidden="true" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleEditColumn(table.id, column)}
                                      disabled={!column.id || editingColumn !== null || isBusy}
                                      aria-label={t('Edit')}
                                      title={t('Edit')}
                                    >
                                      <RiEdit2Line className="h-4 w-4" aria-hidden="true" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {hasMoreColumns && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                            <span className="text-xs text-muted-foreground">
                              {t('Showing {count} of {total} columns', {
                                count: visibleColumnCount,
                                total: table.columns.length,
                              })}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setVisibleColumnCounts((prev) => ({
                                  ...prev,
                                  [table.id]: Math.min(
                                    table.columns.length,
                                    visibleColumnCount + COLUMN_PAGE_SIZE,
                                  ),
                                }))
                              }
                              disabled={isBusy}
                            >
                              {t('Load more')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
        {hasMoreTables && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <span className="text-xs text-muted-foreground">
              {t('Showing {count} of {total} tables', {
                count: visibleTableCount,
                total: datasource.tables.length,
              })}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setVisibleTableCount((count) =>
                  Math.min(datasource.tables.length, count + TABLE_PAGE_SIZE),
                )
              }
              disabled={isBusy}
            >
              {t('Load more')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
