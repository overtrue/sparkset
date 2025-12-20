'use client';
import { RiDatabase2Line } from '@remixicon/react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

interface ResultTableProps {
  rows: Record<string, unknown>[];
}

export function ResultTable({ rows }: ResultTableProps) {
  // Generate columns dynamically from data
  const columns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (rows.length === 0) return [];

    const columnKeys = Object.keys(rows[0] ?? {});
    return columnKeys.map((key) => ({
      accessorKey: key,
      header: ({ column }) => <DataTableColumnHeader column={column} title={key} />,
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <div className="max-w-full truncate" title={String(value ?? '')}>
            {String(value ?? '')}
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
              <RiDatabase2Line className="h-8 w-8 text-gray-400" />
            </EmptyMedia>
            <EmptyDescription className="text-base font-semibold text-foreground mt-2">
              查询成功但无数据返回
            </EmptyDescription>
            <p className="text-muted-foreground text-sm mt-1">数据表中暂无匹配记录</p>
          </EmptyHeader>
          <EmptyContent className="opacity-40">
            <span className="text-xs tracking-widest">•••</span>
          </EmptyContent>
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
      searchPlaceholder="搜索结果..."
      emptyMessage="无匹配结果"
    />
  );
}
