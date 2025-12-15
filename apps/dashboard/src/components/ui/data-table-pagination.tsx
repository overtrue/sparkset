'use client';

import { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex-1 whitespace-nowrap text-sm text-muted-foreground" aria-live="polite">
        第 <span className="text-foreground">{table.getState().pagination.pageIndex + 1}</span>{' '}
        页，共 <span className="text-foreground">{table.getPageCount()}</span> 页
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="上一页"
        >
          上一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="下一页"
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
