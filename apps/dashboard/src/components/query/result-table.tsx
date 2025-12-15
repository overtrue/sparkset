'use client';

import { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';

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
        return <span className="whitespace-nowrap">{String(value ?? '')}</span>;
      },
    }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center px-6">
        <p className="text-sm text-muted-foreground">查询成功但无数据返回</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={rows}
        enableGlobalFilter
        showRecordCount
        searchPlaceholder="搜索结果..."
        emptyMessage="无匹配结果"
      />
    </div>
  );
}
