import { RiDeleteBinLine, RiEditLine, RiPlayLine } from '@remixicon/react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n/use-translations';
import type { ActionDTO } from '@/types/api';

type Translate = ReturnType<typeof useTranslations>;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

function formatDate(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return dateFormatter.format(date);
}

interface ActionColumnsOptions {
  t: Translate;
  executingId: number | null;
  deletingId: number | null;
  onExecute: (id: number) => void;
  onEdit: (action: ActionDTO) => void;
  onDelete: (id: number) => void;
}

export function createActionColumns({
  t,
  executingId,
  deletingId,
  onExecute,
  onEdit,
  onDelete,
}: ActionColumnsOptions): ColumnDef<ActionDTO>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Name')} />,
      cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
      size: 180,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Type')} />,
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs uppercase">
          {row.getValue('type')}
        </Badge>
      ),
      size: 100,
    },
    {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Description')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('description') || '-'}</span>
      ),
      size: 200,
    },
    {
      id: 'updatedAt',
      accessorFn: (row) => row.updatedAt || row.createdAt,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Last Updated')} />,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.getValue('updatedAt'))}
        </span>
      ),
      size: 180,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('Actions')}</span>,
      cell: ({ row }) => {
        const action = row.original;
        const capabilities = action.capabilities;
        const canExecute = Boolean(capabilities?.canExecute);
        const canManage = Boolean(capabilities?.canManage);
        const isExecuting = executingId === action.id;
        const isDeleting = deletingId === action.id;

        const executeButton = (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExecute(action.id)}
            disabled={!canExecute || isExecuting}
            className="h-7"
          >
            <RiPlayLine
              className={`h-3.5 w-3.5 ${isExecuting ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            {isExecuting ? t('Executing…') : t('Execute')}
          </Button>
        );

        const rowActions: RowAction[] = [
          {
            label: t('Edit'),
            icon: <RiEditLine className="h-4 w-4" aria-hidden="true" />,
            onClick: () => onEdit(action),
            disabled: !canManage || isDeleting,
          },
          {
            label: t('Delete'),
            icon: <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />,
            onClick: () => onDelete(action.id),
            variant: 'destructive',
            disabled: !canManage || isDeleting,
          },
        ];

        return (
          <div className="flex items-center justify-end gap-2">
            {executeButton}
            <DataTableRowActions actions={rowActions} />
          </div>
        );
      },
      size: 180,
    },
  ];
}
