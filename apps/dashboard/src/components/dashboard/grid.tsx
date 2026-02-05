'use client';

import type { Chart, Dataset } from '@/types/chart';
import type { DashboardWidget } from '@/types/dashboard';
import { useCallback, useMemo } from 'react';
import ReactGridLayout, {
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { Widget } from './widget';

interface DashboardGridProps {
  widgets: DashboardWidget[];
  widgetRefreshKeys?: Map<number, number>; // widgetId -> refreshKey
  charts?: Map<number, Chart>; // 图表列表，用于获取标题
  datasets?: Map<number, Dataset>; // 数据集列表，用于获取标题
  onLayoutChange?: (layouts: { id: number; x: number; y: number; w: number; h: number }[]) => void;
  onRefresh?: (widgetId: number) => void;
  onEdit?: (widget: DashboardWidget) => void;
  onRemove?: (widgetId: number) => void;
}

const GRID_CONFIG = {
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight: 16, // 最小格子高度（px）
  margin: [8, 8], // widget 之间的间距
  containerPadding: [0, 0], // 容器内边距
  isDraggable: true,
  isResizable: true,
  draggableHandle: '.widget-drag-handle', // 拖拽手柄（暂时不使用，允许整个 widget 拖拽）
  preventCollision: false, // 防止碰撞
  compactType: 'horizontal' as const, // 垂直紧凑
};

export function DashboardGrid({
  widgets,
  widgetRefreshKeys,
  charts = new Map<number, Chart>(),
  datasets = new Map<number, Dataset>(),
  onLayoutChange,
  onRefresh,
  onEdit,
  onRemove,
}: DashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const chartMap = charts;
  const datasetMap = datasets;

  // 根据当前宽度计算对应的 cols
  const currentCols = useMemo(() => {
    if (width >= 1200) return GRID_CONFIG.cols.lg;
    if (width >= 996) return GRID_CONFIG.cols.md;
    if (width >= 768) return GRID_CONFIG.cols.sm;
    if (width >= 480) return GRID_CONFIG.cols.xs;
    return GRID_CONFIG.cols.xxs;
  }, [width]);

  // 将 widgets 转换为 GridLayout 需要的格式
  const layouts: Layout = useMemo(
    () =>
      widgets.map((widget) => ({
        i: String(widget.id),
        x: widget.x,
        y: widget.y,
        w: widget.w,
        h: widget.h,
        minW: 2, // 最小宽度（格子数）
        minH: 2, // 最小高度（格子数）
      })),
    [widgets],
  );

  // 处理布局变更
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (onLayoutChange) {
        // 过滤掉无效的布局项（x, y, w, h 不能为 null）
        const layouts = newLayout
          .filter((layoutItem) => {
            return (
              layoutItem.x !== null &&
              layoutItem.y !== null &&
              layoutItem.w !== null &&
              layoutItem.h !== null
            );
          })
          .map((layoutItem) => ({
            id: Number(layoutItem.i),
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          }));
        onLayoutChange(layouts);
      }
    },
    [onLayoutChange],
  );

  return (
    <div className="w-full" ref={containerRef}>
      {mounted && (
        <ReactGridLayout
          className="layout"
          layout={layouts}
          width={width}
          gridConfig={{
            cols: currentCols,
            rowHeight: GRID_CONFIG.rowHeight,
            margin: GRID_CONFIG.margin as [number, number],
            containerPadding: GRID_CONFIG.containerPadding as [number, number],
          }}
          dragConfig={{
            enabled: GRID_CONFIG.isDraggable,
            handle: GRID_CONFIG.draggableHandle,
          }}
          resizeConfig={{
            enabled: GRID_CONFIG.isResizable,
            handles: ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'], // 允许从四个边和四个角调整
          }}
          compactor={verticalCompactor}
          onLayoutChange={handleLayoutChange}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-drag-handle">
              <Widget
                widget={widget}
                refreshKey={widgetRefreshKeys?.get(widget.id)}
                charts={chartMap}
                datasets={datasetMap}
                onRefresh={onRefresh}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}
