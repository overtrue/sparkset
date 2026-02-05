'use client';
import { RiDatabase2Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

interface ResultTableProps {
  rows: Record<string, unknown>[];
}

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};

export function ResultTable({ rows }: ResultTableProps) {
  const t = useTranslations();
  // Generate columns dynamically from data
  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (rows.length === 0) return [];

    const columnKeys = Object.keys(rows[0] ?? {});
    return columnKeys.map((key) => ({
      accessorKey: key,
      header: ({ column }) => <DataTableColumnHeader column={column} title={key} />,
      cell: ({ getValue }) => {
        const displayValue = formatCellValue(getValue());
        return (
          <div className="max-w-full truncate" title={displayValue}>
            {displayValue}
          </div>
        );
      },
    }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="py-12 flex justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiDatabase2Line className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-base font-semibold text-foreground mt-2">
              {t('Query successful but no data returned')}
            </EmptyTitle>
            <EmptyDescription className="text-muted-foreground text-sm mt-1">
              {t('No matching records in the table')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      enableGlobalFilter
      showRecordCount
      searchPlaceholder={t('Search results')}
      emptyMessage={t('No matching results found')}
    />
  );
}
