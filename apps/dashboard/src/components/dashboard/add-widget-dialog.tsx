'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { chartsApi } from '@/lib/api/charts';
import { datasetsApi } from '@/lib/api/datasets';
import type { Chart, Dataset } from '@/types/chart';
import type {
  WidgetType,
  ChartWidgetConfig,
  DatasetWidgetConfig,
  TextWidgetConfig,
} from '@/types/dashboard';
import { toast } from 'sonner';

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    widgets: Array<{
      title: string;
      type: WidgetType;
      x: number;
      y: number;
      w: number;
      h: number;
      config: ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;
    }>,
  ) => void;
}

export function AddWidgetDialog({ open, onOpenChange, onAdd }: AddWidgetDialogProps) {
  const [activeTab, setActiveTab] = useState<WidgetType>('chart');
  const [selectedChartIds, setSelectedChartIds] = useState<Set<number>>(new Set());
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<number>>(new Set());
  const [textContent, setTextContent] = useState('');
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // 关闭时重置状态
      setSelectedChartIds(new Set());
      setSelectedDatasetIds(new Set());
      setTextContent('');
      setActiveTab('chart');
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [chartsResult, datasetsResult] = await Promise.all([
        chartsApi.list(),
        datasetsApi.list(),
      ]);
      setCharts(chartsResult.items);
      setDatasets(datasetsResult.items);
    } catch (error) {
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChartToggle = (chartId: number) => {
    setSelectedChartIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chartId)) {
        newSet.delete(chartId);
      } else {
        newSet.add(chartId);
      }
      return newSet;
    });
  };

  const handleDatasetToggle = (datasetId: number) => {
    setSelectedDatasetIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(datasetId)) {
        newSet.delete(datasetId);
      } else {
        newSet.add(datasetId);
      }
      return newSet;
    });
  };

  const handleSubmit = () => {
    const widgets: Array<{
      title: string;
      type: WidgetType;
      x: number;
      y: number;
      w: number;
      h: number;
      config: ChartWidgetConfig | DatasetWidgetConfig | TextWidgetConfig;
    }> = [];

    // 默认尺寸：图表和数据集使用较大的尺寸，文本使用较小的尺寸
    // rowHeight 是 16px，所以 h: 12 = 192px, h: 6 = 96px
    const defaultSize = {
      chart: { w: 6, h: 12 },
      dataset: { w: 6, h: 12 },
      text: { w: 6, h: 6 },
    };

    // 处理图表
    selectedChartIds.forEach((chartId) => {
      widgets.push({
        title: '', // 标题默认为空
        type: 'chart',
        x: 0, // 位置会在页面中计算
        y: 0, // 位置会在页面中计算
        w: defaultSize.chart.w,
        h: defaultSize.chart.h,
        config: { chartId },
      });
    });

    // 处理数据集
    selectedDatasetIds.forEach((datasetId) => {
      widgets.push({
        title: '', // 标题默认为空
        type: 'dataset',
        x: 0, // 位置会在页面中计算
        y: 0, // 位置会在页面中计算
        w: defaultSize.dataset.w,
        h: defaultSize.dataset.h,
        config: { datasetId },
      });
    });

    // 处理文本
    if (textContent.trim()) {
      widgets.push({
        title: '', // 标题默认为空
        type: 'text',
        x: 0,
        y: 0,
        w: defaultSize.text.w,
        h: defaultSize.text.h,
        config: { content: textContent.trim() },
      });
    }

    if (widgets.length === 0) {
      toast.error('请至少选择一个项目');
      return;
    }

    onAdd(widgets);
    onOpenChange(false);
  };

  const hasSelection =
    selectedChartIds.size > 0 || selectedDatasetIds.size > 0 || textContent.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>添加 Widget</DialogTitle>
          <DialogDescription>选择要添加的 Widget（支持多选）</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as WidgetType)}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chart">图表</TabsTrigger>
              <TabsTrigger value="dataset">数据集</TabsTrigger>
              <TabsTrigger value="text">文本</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="flex-1 overflow-auto mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : charts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无图表</div>
              ) : (
                <div className="space-y-2">
                  {charts.map((chart) => (
                    <div
                      key={chart.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                      onClick={() => handleChartToggle(chart.id)}
                    >
                      <Checkbox
                        checked={selectedChartIds.has(chart.id)}
                        onCheckedChange={() => handleChartToggle(chart.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{chart.title}</div>
                        {chart.description && (
                          <div className="text-sm text-muted-foreground">{chart.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="dataset" className="flex-1 overflow-auto mt-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">加载中...</div>
              ) : datasets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无数据集</div>
              ) : (
                <div className="space-y-2">
                  {datasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                      onClick={() => handleDatasetToggle(dataset.id)}
                    >
                      <Checkbox
                        checked={selectedDatasetIds.has(dataset.id)}
                        onCheckedChange={() => handleDatasetToggle(dataset.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{dataset.name}</div>
                        {dataset.description && (
                          <div className="text-sm text-muted-foreground">{dataset.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="flex-1 overflow-auto mt-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-2">内容（支持 Markdown）</div>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="输入文本内容，支持 Markdown 格式"
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!hasSelection}>
            添加 ({selectedChartIds.size + selectedDatasetIds.size + (textContent.trim() ? 1 : 0)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
