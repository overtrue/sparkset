'use client';
import { RiArrowDownSFill, RiArrowUpSFill, RiExpandUpDownFill } from '@remixicon/react';

import { Column } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        <span>{title}</span>
        {column.getIsSorted() === 'asc' ? (
          <RiArrowUpSFill className="ml-2 h-4 w-4" />
        ) : column.getIsSorted() === 'desc' ? (
          <RiArrowDownSFill className="ml-2 h-4 w-4" />
        ) : (
          <RiExpandUpDownFill className="ml-2 h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
