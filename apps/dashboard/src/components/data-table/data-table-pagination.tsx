'use client';

import { Table } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex-1 whitespace-nowrap text-sm text-muted-foreground" aria-live="polite">
        {t('Page {page} of {total}', {
          page: table.getState().pagination.pageIndex + 1,
          total: table.getPageCount(),
        })}
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label={t('Previous')}
        >
          {t('Previous')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label={t('Next')}
        >
          {t('Next')}
        </Button>
      </div>
    </div>
  );
}
