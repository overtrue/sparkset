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
import { useRouter } from 'next/navigation';

interface WidgetMenuProps {
  widget: DashboardWidget;
  onRefresh?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

export function WidgetMenu({ widget, onRefresh, onEdit, onRemove }: WidgetMenuProps) {
  const router = useRouter();
  const t = useTranslations();

  const handleEditChart = () => {
    if (widget.type === 'chart') {
      const config = widget.config as { chartId: number };
      router.push(`/dashboard/charts/${config.chartId}/edit`);
    }
  };

  const handleViewDataset = () => {
    if (widget.type === 'dataset') {
      const config = widget.config as { datasetId: number };
      router.push(`/dashboard/datasets/${config.datasetId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <RiMore2Line className="h-4 w-4" />
          <span className="sr-only">{t('Widget Menu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {widget.type === 'chart' && (
          <>
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RiRefreshLine className="h-4 w-4" />
                {t('Refresh')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleEditChart}>
              <RiEditLine className="h-4 w-4" />
              {t('Edit Chart')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {widget.type === 'dataset' && (
          <>
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RiRefreshLine className="h-4 w-4" />
                {t('Refresh')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleViewDataset}>
              <RiDatabaseLine className="h-4 w-4" />
              {t('View Details')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {widget.type === 'text' && (
          <>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <RiEditLine className="h-4 w-4" />
                {t('Edit')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {onRemove && (
          <DropdownMenuItem onClick={onRemove} className="text-destructive">
            <RiDeleteBinLine className="h-4 w-4" />
            {t('Remove')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
