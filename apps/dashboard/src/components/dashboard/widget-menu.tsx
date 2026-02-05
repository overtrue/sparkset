'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardWidget } from '@/types/dashboard';
import {
  RiDatabaseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiMore2Line,
  RiRefreshLine,
} from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { Link } from '@/i18n/client-routing';

interface WidgetMenuProps {
  widget: DashboardWidget;
  onRefresh?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

export function WidgetMenu({ widget, onRefresh, onEdit, onRemove }: WidgetMenuProps) {
  const t = useTranslations();
  const chartId = widget.type === 'chart' ? (widget.config as { chartId: number }).chartId : null;
  const datasetId =
    widget.type === 'dataset' ? (widget.config as { datasetId: number }).datasetId : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <RiMore2Line className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t('Widget Menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {widget.type === 'chart' && (
          <>
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RiRefreshLine className="h-4 w-4" aria-hidden="true" />
                {t('Refresh')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/charts/${String(chartId)}/edit`}>
                <RiEditLine className="h-4 w-4" aria-hidden="true" />
                {t('Edit Chart')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {widget.type === 'dataset' && (
          <>
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RiRefreshLine className="h-4 w-4" aria-hidden="true" />
                {t('Refresh')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/datasets/${String(datasetId)}`}>
                <RiDatabaseLine className="h-4 w-4" aria-hidden="true" />
                {t('View Details')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {widget.type === 'text' && (
          <>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <RiEditLine className="h-4 w-4" aria-hidden="true" />
                {t('Edit')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {onRemove && (
          <DropdownMenuItem onClick={onRemove} variant="destructive">
            <RiDeleteBinLine className="h-4 w-4" aria-hidden="true" />
            {t('Remove')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
