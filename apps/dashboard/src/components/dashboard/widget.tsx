'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Chart, Dataset } from '@/types/chart';
import { useTranslations } from '@/i18n/use-translations';
import type { DashboardWidget } from '@/types/dashboard';
import { ChartWidget } from './chart-widget';
import { DatasetWidget } from './dataset-widget';
import { TextWidget } from './text-widget';
import { WidgetMenu } from './widget-menu';

interface WidgetProps {
  widget: DashboardWidget;
  refreshKey?: number;
  charts?: Map<number, Chart>; // 图表列表，用于获取标题
  datasets?: Map<number, Dataset>; // 数据集列表，用于获取标题
  onRefresh?: (widgetId: number) => void;
  onEdit?: (widget: DashboardWidget) => void;
  onRemove?: (widgetId: number) => void;
}

export function Widget({
  widget,
  refreshKey,
  charts = new Map<number, Chart>(),
  datasets = new Map<number, Dataset>(),
  onRefresh,
  onEdit,
  onRemove,
}: WidgetProps) {
  const t = useTranslations();
  const handleEdit = () => {
    if (onEdit) {
      onEdit(widget);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(widget.id);
    }
  };

  const renderContent = () => {
    switch (widget.type) {
      case 'chart':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <ChartWidget config={widget.config as any} refreshKey={refreshKey} />;
      case 'dataset':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <DatasetWidget config={widget.config as any} refreshKey={refreshKey} />;
      case 'text':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <TextWidget config={widget.config as any} />;
      default:
        return <div className="p-4 text-muted-foreground">{t('Unknown widget type')}</div>;
    }
  };

  // 获取显示标题：如果 widget.title 为空，则使用来源对象的标题
  const getDisplayTitle = (): string | null => {
    // 如果 widget 有自定义标题，优先使用
    if (widget.title && widget.title.trim().length > 0) {
      return widget.title;
    }

    // 否则使用来源对象的标题
    if (widget.type === 'chart') {
      const config = widget.config as { chartId: number };
      const chart = charts.get(config.chartId);
      return chart?.title || null;
    } else if (widget.type === 'dataset') {
      const config = widget.config as { datasetId: number };
      const dataset = datasets.get(config.datasetId);
      return dataset?.name || null;
    }

    return null;
  };

  const displayTitle = getDisplayTitle();
  const hasTitle = displayTitle !== null;

  return (
    <Card className="h-full w-full flex flex-col p-0 gap-0 relative shadow-none">
      {hasTitle ? (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
          <CardTitle className="text-sm font-medium">{displayTitle}</CardTitle>
          <WidgetMenu
            widget={widget}
            onRefresh={widget.type !== 'text' && onRefresh ? () => onRefresh(widget.id) : undefined}
            onEdit={handleEdit} // 允许所有类型编辑标题
            onRemove={handleRemove}
          />
        </CardHeader>
      ) : (
        <div className="absolute top-2 right-2 z-10">
          <WidgetMenu
            widget={widget}
            onRefresh={widget.type !== 'text' && onRefresh ? () => onRefresh(widget.id) : undefined}
            onEdit={widget.type === 'text' ? handleEdit : undefined}
            onRemove={handleRemove}
          />
        </div>
      )}
      <CardContent className={`flex-1 overflow-hidden p-0 ${!hasTitle ? 'pt-2' : ''}`}>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
