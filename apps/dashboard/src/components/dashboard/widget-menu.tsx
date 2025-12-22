'use client';

import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  RiMore2Line,
  RiRefreshLine,
  RiEditLine,
  RiDeleteBinLine,
  RiBarChartLine,
  RiDatabaseLine,
  RiFileTextLine,
} from '@remixicon/react';
import type { DashboardWidget } from '@/types/dashboard';

interface WidgetMenuProps {
  widget: DashboardWidget;
  onRefresh?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}

export function WidgetMenu({ widget, onRefresh, onEdit, onRemove }: WidgetMenuProps) {
  const router = useRouter();

  const handleEditChart = () => {
    if (widget.type === 'chart') {
      const config = widget.config as { chartId: number };
      router.push(`/charts/${config.chartId}/edit`);
    }
  };

  const handleViewDataset = () => {
    if (widget.type === 'dataset') {
      const config = widget.config as { datasetId: number };
      router.push(`/datasets/${config.datasetId}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <RiMore2Line className="h-4 w-4" />
          <span className="sr-only">Widget 菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {widget.type === 'chart' && (
          <>
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RiRefreshLine className="mr-2 h-4 w-4" />
                刷新
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleEditChart}>
              <RiEditLine className="mr-2 h-4 w-4" />
              编辑图表
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {widget.type === 'dataset' && (
          <>
            {onRefresh && (
              <DropdownMenuItem onClick={onRefresh}>
                <RiRefreshLine className="mr-2 h-4 w-4" />
                刷新
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleViewDataset}>
              <RiDatabaseLine className="mr-2 h-4 w-4" />
              查看详情
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {widget.type === 'text' && (
          <>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <RiEditLine className="mr-2 h-4 w-4" />
                编辑
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        {onRemove && (
          <DropdownMenuItem onClick={onRemove} className="text-destructive">
            <RiDeleteBinLine className="mr-2 h-4 w-4" />
            移除
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
