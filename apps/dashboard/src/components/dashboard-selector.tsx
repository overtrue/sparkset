'use client';
import { RiArrowDownSLine, RiCheckLine, RiDashboardLine, RiLoader4Line } from '@remixicon/react';
import { useTranslations } from '@/i18n/use-translations';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/client-routing';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addWidget, fetchDashboards } from '@/lib/api/dashboards';
import { createDataset } from '@/lib/api/datasets';
import type { Dashboard, ChartWidgetConfig, DatasetWidgetConfig } from '@/types/dashboard';
import { toast } from 'sonner';

interface DashboardSelectorProps {
  type: 'dataset' | 'chart' | 'query-result';
  contentId?: number; // 数据集或图表的 ID（query-result 时不需要）

  // 查询结果数据（仅当 type === 'query-result' 时需要）
  queryResult?: {
    sql: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: any[];
    datasourceId: number;
    question?: string;
  };

  // 回调
  onAdded?: (dashboardId: number) => void;

  // 样式
  className?: string;
  variant?: 'button' | 'dropdown';
  size?: 'sm' | 'default';

  // 外部控制
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DEFAULT_WIDGET_SIZE = { w: 6, h: 12 };

// 从 rows 推断 schema
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inferSchema(rows: any[]) {
  if (!rows || rows.length === 0) return [];

  const firstRow = rows[0];
  const schema = Object.keys(firstRow).map((key) => {
    const value = firstRow[key];
    // Convert to backend expected types: quantitative, temporal, nominal, ordinal
    const rawType = typeof value === 'number' ? 'quantitative' : 'nominal';
    return { name: key, type: rawType };
  });

  return schema;
}

export function DashboardSelector({
  type,
  contentId,
  queryResult,
  onAdded,
  className,
  variant = 'button',
  size = 'default',
  defaultOpen = false,
  onOpenChange,
}: DashboardSelectorProps) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const selectedDashboard = useMemo(
    () => dashboards.find((dashboard) => dashboard.id === selectedDashboardId),
    [dashboards, selectedDashboardId],
  );

  // 同步外部控制
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      setOpen(newOpen);
      onOpenChange?.(newOpen);
    },
    [onOpenChange],
  );

  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const loadDashboards = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchDashboards();
      setDashboards(result.items);
    } catch {
      toast.error(tRef.current('Failed to load dashboards'));
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载仪表盘列表
  useEffect(() => {
    if (open) {
      void loadDashboards();
    }
  }, [open, loadDashboards]);

  const handleAdd = useCallback(async () => {
    if (!selectedDashboardId) {
      toast.error(t('Please select a dashboard'));
      return;
    }

    try {
      setAdding(true);

      let finalContentId = contentId;
      let widgetType: 'chart' | 'dataset' = type === 'chart' ? 'chart' : 'dataset';

      // 如果是查询结果，需要先保存为数据集
      if (type === 'query-result' && queryResult) {
        if (!queryResult.datasourceId) {
          toast.error(t('Missing datasource information'));
          return;
        }

        // 推断 schema
        const schema = inferSchema(queryResult.rows);

        // 创建数据集
        const datasetName = queryResult.question
          ? queryResult.question.slice(0, 50)
          : t('Query Result Dataset');

        const dataset = await createDataset({
          datasourceId: queryResult.datasourceId,
          name: datasetName,
          description: '',
          querySql: queryResult.sql,
          schemaJson: schema,
        });

        finalContentId = dataset.id;
        widgetType = 'dataset';
        toast.success(t('Dataset created successfully'));
      }

      if (!finalContentId) {
        toast.error(t('Missing content ID'));
        return;
      }

      // 构建 widget config
      let config: ChartWidgetConfig | DatasetWidgetConfig;
      if (widgetType === 'chart') {
        config = { chartId: finalContentId };
      } else {
        config = { datasetId: finalContentId };
      }

      // 默认尺寸：参考 add-widget-dialog.tsx
      // 添加到仪表盘
      await addWidget(selectedDashboardId, {
        title: '', // 标题默认为空，使用来源对象的标题
        type: widgetType,
        x: 0, // 位置会在仪表盘中计算
        y: 0,
        w: DEFAULT_WIDGET_SIZE.w,
        h: DEFAULT_WIDGET_SIZE.h,
        config,
      });

      toast.success(t('Successfully added to dashboard'));
      handleOpenChange(false);
      onAdded?.(selectedDashboardId);
      // 跳转到仪表盘页面
      router.push(`/dashboard/dashboards/${selectedDashboardId}`);
    } catch {
      toast.error(t('Failed to add to dashboard'));
    } finally {
      setAdding(false);
    }
  }, [contentId, onAdded, queryResult, router, selectedDashboardId, t, type]);

  const renderDashboardList = (options: {
    onSelect: (dashboard: Dashboard) => void;
    footer?: React.ReactNode;
  }) => (
    <Command>
      <CommandInput
        placeholder={t('Search dashboard…')}
        aria-label={t('Search dashboard')}
        name="dashboard-search"
        autoComplete="off"
      />
      <CommandList>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{t('Loading…')}</div>
        ) : (
          <>
            <CommandEmpty>{t('No dashboard found')}</CommandEmpty>
            <CommandGroup>
              {dashboards.map((dashboard) => (
                <CommandItem
                  key={dashboard.id}
                  value={`${dashboard.id} ${dashboard.title}`}
                  onSelect={() => options.onSelect(dashboard)}
                  className="py-1.5"
                >
                  <RiCheckLine
                    className={cn(
                      'mr-2 h-3 w-3 shrink-0',
                      selectedDashboardId === dashboard.id ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden="true"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{dashboard.title}</div>
                    {dashboard.description && (
                      <div className="text-xs text-muted-foreground">{dashboard.description}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {options.footer}
          </>
        )}
      </CommandList>
    </Command>
  );

  // Button 模式
  if (variant === 'button') {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          disabled={adding}
          className={buttonVariants({
            variant: 'outline',
            size,
            className: cn('gap-1.5', className),
          })}
        >
          {adding ? (
            <>
              <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('Adding…')}
            </>
          ) : (
            <>
              <RiDashboardLine className="h-4 w-4" aria-hidden="true" />
              {t('Add to Dashboard')}
            </>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          {renderDashboardList({
            onSelect: (dashboard) => {
              setSelectedDashboardId(dashboard.id);
            },
            footer:
              dashboards.length > 0 && selectedDashboardId ? (
                <div className="border-t p-2">
                  <Button className="w-full" size="sm" onClick={handleAdd} disabled={adding}>
                    {adding ? (
                      <>
                        <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {t('Adding…')}
                      </>
                    ) : (
                      <>
                        <RiDashboardLine className="h-4 w-4" aria-hidden="true" />
                        {t('Add to')} {selectedDashboard?.title}
                      </>
                    )}
                  </Button>
                </div>
              ) : null,
          })}
        </PopoverContent>
      </Popover>
    );
  }

  // Dropdown 模式（类似 datasource-selector）
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          role="combobox"
          aria-expanded={open}
          disabled={adding || loading}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className:
              'text-xs border-border/50 bg-background hover:bg-muted/50 min-w-[160px] px-2 justify-between font-normal',
          })}
        >
          {selectedDashboard ? selectedDashboard.title : t('Select Dashboard')}
          <RiArrowDownSLine className="ml-2 h-3 w-3 shrink-0 opacity-50" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          {renderDashboardList({
            onSelect: (dashboard) => {
              setSelectedDashboardId(dashboard.id);
              handleOpenChange(false);
            },
          })}
        </PopoverContent>
      </Popover>
      {selectedDashboardId && (
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs"
          onClick={handleAdd}
          disabled={adding}
        >
          {adding ? (
            <>
              <RiLoader4Line className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('Adding…')}
            </>
          ) : (
            t('Add')
          )}
        </Button>
      )}
    </div>
  );
}
