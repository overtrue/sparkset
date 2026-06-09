import { RiCheckLine, RiDeleteBin2Line, RiEdit2Line, RiStarLine } from '@remixicon/react';
import type { ColumnDef } from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
  DataTableRowActions,
  type RowAction,
} from '@/components/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from '@/i18n/use-translations';
import { getProviderLabel } from '@/lib/aiProviderTypes';
import type { AIProviderDTO } from '@/types/api';

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

interface AIProviderColumnsOptions {
  t: Translate;
  canManage: boolean;
  canManageCredentials: boolean;
  pendingActionId: number | null;
  onSetDefault: (id: number) => void;
  onEdit: (provider: AIProviderDTO) => void;
  onDelete: (id: number) => void;
}

export function createAIProviderColumns({
  t,
  canManage,
  canManageCredentials,
  pendingActionId,
  onSetDefault,
  onEdit,
  onDelete,
}: AIProviderColumnsOptions): ColumnDef<AIProviderDTO>[] {
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
        <span className="text-muted-foreground">{getProviderLabel(row.getValue('type'))}</span>
      ),
      size: 140,
    },
    {
      accessorKey: 'defaultModel',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Default Model')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('defaultModel') || '-'}</span>
      ),
      size: 140,
    },
    {
      accessorKey: 'isDefault',
      header: t('Status'),
      cell: ({ row }) =>
        row.getValue('isDefault') ? (
          <Badge variant="default" className="gap-1">
            <RiStarLine className="h-3 w-3 fill-current" aria-hidden="true" />
            {t('Default')}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <RiCheckLine className="h-3 w-3" aria-hidden="true" />
            {t('Configured')}
          </Badge>
        ),
      size: 100,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title={t('Updated At')} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.getValue('updatedAt'))}</span>
      ),
      size: 180,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('Actions')}</span>,
      cell: ({ row }) => {
        const provider = row.original;
        const isLoading = pendingActionId === provider.id;

        const actions: RowAction[] = [];

        if (!provider.isDefault) {
          actions.push({
            label: t('Set as Default'),
            icon: <RiStarLine className="h-4 w-4" aria-hidden="true" />,
            onClick: () => {
              onSetDefault(provider.id);
            },
            disabled: !canManage || isLoading,
          });
        }

        actions.push(
          {
            label: t('Edit'),
            icon: <RiEdit2Line className="h-4 w-4" aria-hidden="true" />,
            onClick: () => onEdit(provider),
            disabled: !canManageCredentials || isLoading,
          },
          {
            label: t('Delete'),
            icon: <RiDeleteBin2Line className="h-4 w-4" aria-hidden="true" />,
            onClick: () => onDelete(provider.id),
            variant: 'destructive',
            disabled: !canManage || isLoading,
          },
        );

        return <DataTableRowActions actions={actions} />;
      },
      size: 60,
    },
  ];
}
