'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, Trash2, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSpacer,
} from '@/components/ui/table';

import { cn } from '@/lib/utils';
import { DataTablePagination } from './data-table-pagination';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  enableGlobalFilter?: boolean;
  showRecordCount?: boolean;
  onDeleteSelected?: (rows: TData[]) => void;
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string | ((count: number) => string);
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  pageSize?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = '搜索...',
  enableRowSelection = false,
  enableGlobalFilter = false,
  showRecordCount = false,
  onDeleteSelected,
  deleteConfirmTitle = '确认删除',
  deleteConfirmDescription = (count: number) =>
    `确定要删除选中的 ${count} 条记录吗？此操作不可撤销。`,
  toolbar,
  emptyMessage = '暂无数据',
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Add selection column if enabled
  const finalColumns: ColumnDef<TData, TValue>[] = enableRowSelection
    ? [
        {
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="全选"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="选择行"
            />
          ),
          size: 40,
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<TData, TValue>,
        ...columns,
      ]
    : columns;

  const table = useReactTable({
    data,
    columns: finalColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    enableSortingRemoval: false,
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const searchValue = enableGlobalFilter
    ? globalFilter
    : searchKey
      ? (table.getColumn(searchKey)?.getFilterValue() as string)
      : '';

  const handleDeleteSelected = () => {
    if (onDeleteSelected && selectedRows.length > 0) {
      onDeleteSelected(selectedRows.map((row) => row.original));
      table.resetRowSelection();
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side - Search */}
        <div className="flex items-center gap-3">
          {(searchKey || enableGlobalFilter) && (
            <div className="relative">
              <Input
                id={`${id}-search`}
                ref={inputRef}
                className={cn('peer min-w-60 ps-9', Boolean(searchValue) && 'pe-9')}
                value={searchValue ?? ''}
                onChange={(e) => {
                  if (enableGlobalFilter) {
                    setGlobalFilter(e.target.value);
                  } else if (searchKey) {
                    table.getColumn(searchKey)?.setFilterValue(e.target.value);
                  }
                }}
                placeholder={searchPlaceholder}
                type="text"
                aria-label={searchPlaceholder}
              />
              <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground/40 peer-disabled:opacity-50">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              {Boolean(searchValue) && (
                <button
                  className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/60 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="清除搜索"
                  onClick={() => {
                    if (enableGlobalFilter) {
                      setGlobalFilter('');
                    } else if (searchKey) {
                      table.getColumn(searchKey)?.setFilterValue('');
                    }
                    inputRef.current?.focus();
                  }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {showRecordCount && (
            <span className="text-sm text-muted-foreground">
              共{' '}
              <span className="font-medium text-foreground">
                {table.getFilteredRowModel().rows.length}
              </span>{' '}
              条记录
            </span>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {enableRowSelection && selectedRows.length > 0 && onDeleteSelected && (
            <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="-ms-1 opacity-60" size={16} aria-hidden="true" />
              删除
              <span className="-me-1 ms-1 inline-flex h-5 max-h-full items-center rounded border border-border bg-background px-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
                {selectedRows.length}
              </span>
            </Button>
          )}
          {toolbar}
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableSpacer />
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={finalColumns.length} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableSpacer />
      </Table>

      {/* Pagination */}
      {table.getRowModel().rows.length > 0 && <DataTablePagination table={table} />}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {typeof deleteConfirmDescription === 'function'
                ? deleteConfirmDescription(selectedRows.length)
                : deleteConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
