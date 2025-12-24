'use client';
import { RiArrowDownSLine, RiCheckLine, RiDashboardLine, RiLoader4Line } from '@remixicon/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { dashboardsApi } from '@/lib/api/dashboards';
import { datasetsApi } from '@/lib/api/datasets';
import type { Dashboard, ChartWidgetConfig, DatasetWidgetConfig } from '@/types/dashboard';
import { toast } from 'sonner';

interface DashboardSelectorProps {
  type: 'dataset' | 'chart' | 'query-result';
  contentId?: number; // 数据集或图表的 ID（query-result 时不需要）

  // 查询结果数据（仅当 type === 'query-result' 时需要）
  queryResult?: {
    sql: string;
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

// 从 rows 推断 schema
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

  // 同步外部控制
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // 加载仪表盘列表
  useEffect(() => {
    if (open) {
      loadDashboards();
    }
  }, [open]);

  const loadDashboards = async () => {
    try {
      setLoading(true);
      const result = await dashboardsApi.list();
      setDashboards(result.items);
    } catch (error) {
      toast.error(t('Failed to load dashboards'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
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

        const dataset = await datasetsApi.create({
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
      const defaultSize = { w: 6, h: 12 };

      // 添加到仪表盘
      await dashboardsApi.addWidget(selectedDashboardId, {
        title: '', // 标题默认为空，使用来源对象的标题
        type: widgetType,
        x: 0, // 位置会在仪表盘中计算
        y: 0,
        w: defaultSize.w,
        h: defaultSize.h,
        config,
      });

      toast.success(t('Successfully added to dashboard'));
      handleOpenChange(false);
      onAdded?.(selectedDashboardId);
      // 跳转到仪表盘页面
      router.push(`/dashboards/${selectedDashboardId}`);
    } catch (error) {
      toast.error(t('Failed to add to dashboard'));
    } finally {
      setAdding(false);
    }
  };

  const selectedDashboard = dashboards.find((d) => d.id === selectedDashboardId);

  // Button 模式
  if (variant === 'button') {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={cn('gap-1.5', className)}
            disabled={adding}
          >
            {adding ? (
              <>
                <RiLoader4Line className="h-4 w-4 animate-spin" />
                {t('Adding…')}
              </>
            ) : (
              <>
                <RiDashboardLine className="h-4 w-4" />
                {t('Add to Dashboard')}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('Search dashboard')} />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('Loading')}</div>
              ) : (
                <>
                  <CommandEmpty>{t('No dashboard found')}</CommandEmpty>
                  <CommandGroup>
                    {dashboards.map((dashboard) => (
                      <CommandItem
                        key={dashboard.id}
                        value={`${dashboard.id} ${dashboard.title}`}
                        onSelect={() => {
                          setSelectedDashboardId(dashboard.id);
                        }}
                        className="py-1.5"
                      >
                        <RiCheckLine
                          className={cn(
                            'mr-2 h-3 w-3 shrink-0',
                            selectedDashboardId === dashboard.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{dashboard.title}</div>
                          {dashboard.description && (
                            <div className="text-xs text-muted-foreground">
                              {dashboard.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {dashboards.length > 0 && selectedDashboardId && (
                    <div className="border-t p-2">
                      <Button className="w-full" size="sm" onClick={handleAdd} disabled={adding}>
                        {adding ? (
                          <>
                            <RiLoader4Line className="h-4 w-4 animate-spin" />
                            {t('Adding…')}
                          </>
                        ) : (
                          <>
                            <RiDashboardLine className="h-4 w-4" />
                            {t('Add to')} {selectedDashboard?.title}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  // Dropdown 模式（类似 datasource-selector）
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={adding || loading}
            className={cn(
              'h-7 text-xs border-border/50 bg-background hover:bg-muted/50 min-w-[160px] px-2 justify-between font-normal',
            )}
          >
            {selectedDashboard ? selectedDashboard.title : t('Select Dashboard')}
            <RiArrowDownSLine className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('Search dashboard')} />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('Loading')}</div>
              ) : (
                <>
                  <CommandEmpty>{t('No dashboard found')}</CommandEmpty>
                  <CommandGroup>
                    {dashboards.map((dashboard) => (
                      <CommandItem
                        key={dashboard.id}
                        value={`${dashboard.id} ${dashboard.title}`}
                        onSelect={() => {
                          setSelectedDashboardId(dashboard.id);
                          handleOpenChange(false);
                        }}
                        className="py-1.5"
                      >
                        <RiCheckLine
                          className={cn(
                            'mr-2 h-3 w-3 shrink-0',
                            selectedDashboardId === dashboard.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{dashboard.title}</div>
                          {dashboard.description && (
                            <div className="text-xs text-muted-foreground">
                              {dashboard.description}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
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
              <RiLoader4Line className="h-4 w-4 animate-spin" />
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
