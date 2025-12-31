'use client';

import { AddWidgetDialog } from '@/components/dashboard/add-widget-dialog';
import { DashboardEmptyState } from '@/components/dashboard/empty-state';
import { EditDialog } from '@/components/dashboard/edit-dialog';
import { EditTitleDialog } from '@/components/dashboard/edit-title-dialog';
import { DashboardGrid } from '@/components/dashboard/grid';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useDebounceCallback } from '@/hooks/use-debounce-callback';
import { chartsApi } from '@/lib/api/charts';
import { dashboardsApi } from '@/lib/api/dashboards';
import { datasetsApi } from '@/lib/api/datasets';
import type { Chart, Dataset } from '@/types/chart';
import type { Dashboard, DashboardWidget, TextWidgetConfig } from '@/types/dashboard';
import { RiAddLine } from '@remixicon/react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from '@/i18n/use-translations';

export default function DashboardDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const dashboardId = Number(params.id);

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [addWidgetOpen, setAddWidgetOpen] = useState(false);
  const [editWidgetOpen, setEditWidgetOpen] = useState(false);
  const [editTitleOpen, setEditTitleOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [widgetRefreshKeys, setWidgetRefreshKeys] = useState<Map<number, number>>(new Map());
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [data, chartsResult, datasetsResult] = await Promise.all([
        dashboardsApi.get(dashboardId),
        chartsApi.list(),
        datasetsApi.list(),
      ]);
      setDashboard(data);
      // 从关联数据中获取 widgets
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const widgetsData = (data as any).widgets || [];
      setWidgets(widgetsData);
      setCharts(chartsResult.items);
      setDatasets(datasetsResult.items);
    } catch {
      toast.error(t('Failed to load dashboard'));
      router.push('/dashboard/dashboards');
    } finally {
      setLoading(false);
    }
  }, [dashboardId, router]);

  useEffect(() => {
    if (dashboardId) {
      void loadDashboard();
    }
  }, [dashboardId, loadDashboard]); // 只在 dashboardId 变化时重新加载

  // 防抖处理布局变更
  const debouncedLayoutChange = useDebounceCallback(
    async (layouts: { id: number; x: number; y: number; w: number; h: number }[]) => {
      try {
        await dashboardsApi.updateLayout(dashboardId, { layouts });
      } catch {
        toast.error(t('Failed to save layout'));
      }
    },
    300,
  );

  const handleLayoutChange = useCallback(
    (layouts: { id: number; x: number; y: number; w: number; h: number }[]) => {
      debouncedLayoutChange(layouts);
    },
    [debouncedLayoutChange],
  );

  const handleAddWidget = async (
    widgetsData: {
      title: string;
      type: 'chart' | 'dataset' | 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: any;
    }[],
  ) => {
    try {
      // 计算新 widget 的位置：找到所有现有 widgets 的最底部，然后放在底部下方
      let maxY = -1;
      widgets.forEach((w) => {
        const bottomY = w.y + w.h;
        if (bottomY > maxY) {
          maxY = bottomY;
        }
      });

      // 新 widget 放在最底部下方，如果没有任何 widget 则放在顶部
      let currentY = maxY >= 0 ? maxY + 1 : 0;

      // 批量添加 widgets
      const newWidgets: DashboardWidget[] = [];
      for (const widgetData of widgetsData) {
        const widgetDataWithPosition = {
          ...widgetData,
          x: 0, // 默认放在最左边
          y: currentY,
        };

        const newWidget = await dashboardsApi.addWidget(dashboardId, widgetDataWithPosition);
        newWidgets.push(newWidget);

        // 计算下一个 widget 的 Y 位置（考虑 widget 高度和间距）
        currentY += widgetData.h + 1; // +1 是为了间距
      }

      setWidgets((prev) => [...prev, ...newWidgets]);
      toast.success(t('Successfully added {count} widget(s)', { count: newWidgets.length }));
    } catch {
      toast.error(t('Failed to add widget'));
    }
  };

  const handleRefreshWidget = async (widgetId: number) => {
    try {
      await dashboardsApi.refreshWidget(dashboardId, widgetId);
      // 更新 refreshKey 来触发 widget 重新加载
      setWidgetRefreshKeys((prev) => {
        const newMap = new Map(prev);
        newMap.set(widgetId, (prev.get(widgetId) || 0) + 1);
        return newMap;
      });
    } catch {
      toast.error(t('Failed to refresh widget'));
    }
  };

  const handleEditWidget = (widget: DashboardWidget) => {
    if (widget.type === 'text') {
      // 文本类型编辑内容
      setEditingWidget(widget);
      setEditWidgetOpen(true);
    } else {
      // 其他类型编辑标题
      setEditingWidget(widget);
      setEditTitleOpen(true);
    }
  };

  const handleSaveWidget = async (widgetId: number, content: string) => {
    try {
      const widget = widgets.find((w) => w.id === widgetId);
      if (!widget || widget.type !== 'text') return;

      const config: TextWidgetConfig = { content };
      await dashboardsApi.updateWidget(dashboardId, widgetId, { config });
      setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, config: config } : w)));
      toast.success(t('Saved successfully'));
    } catch {
      toast.error(t('Save failed'));
    }
  };

  const handleSaveWidgetTitle = async (widgetId: number, title: string) => {
    try {
      await dashboardsApi.updateWidget(dashboardId, widgetId, { title });
      setWidgets((prev) => prev.map((w) => (w.id === widgetId ? { ...w, title } : w)));
      toast.success(t('Title saved successfully'));
    } catch {
      toast.error(t('Save failed'));
    }
  };

  const handleRemoveWidget = async (widgetId: number) => {
    try {
      await dashboardsApi.deleteWidget(dashboardId, widgetId);
      setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
      toast.success(t('Widget removed'));
    } catch {
      toast.error(t('Failed to remove widget'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('Loading')} description="" />
        <div className="text-center py-12 text-muted-foreground">{t('Loading')}</div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={dashboard.title}
        description={dashboard.description || ''}
        backButton={{ useRouter: true }}
        action={
          <Button onClick={() => setAddWidgetOpen(true)}>
            <RiAddLine className="h-4 w-4" />
            {t('Add Widget')}
          </Button>
        }
      />

      <div className="min-h-[600px]">
        {widgets.length === 0 ? (
          <DashboardEmptyState onAddWidget={() => setAddWidgetOpen(true)} />
        ) : (
          <DashboardGrid
            widgets={widgets}
            widgetRefreshKeys={widgetRefreshKeys}
            charts={charts}
            datasets={datasets}
            onLayoutChange={handleLayoutChange}
            onRefresh={handleRefreshWidget}
            onEdit={handleEditWidget}
            onRemove={handleRemoveWidget}
          />
        )}
      </div>

      <AddWidgetDialog
        open={addWidgetOpen}
        onOpenChange={setAddWidgetOpen}
        onAdd={handleAddWidget}
      />

      <EditDialog
        open={editWidgetOpen}
        onOpenChange={setEditWidgetOpen}
        widget={editingWidget}
        onSave={handleSaveWidget}
      />

      <EditTitleDialog
        open={editTitleOpen}
        onOpenChange={setEditTitleOpen}
        widget={editingWidget}
        onSave={handleSaveWidgetTitle}
      />
    </div>
  );
}
