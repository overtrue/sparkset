import { inject } from '@adonisjs/core';
import DashboardWidget, { type WidgetConfig } from '../models/dashboard_widget.js';
import Dashboard from '../models/dashboard.js';
import Chart from '../models/chart.js';
import Dataset from '../models/dataset.js';
import { toId } from '../utils/validation.js';

@inject()
export class DashboardWidgetService {
  constructor() {}

  /**
   * 添加 widget
   */
  async addWidget(
    dashboardId: number,
    data: {
      title: string;
      type: 'chart' | 'dataset' | 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      config: WidgetConfig;
      order?: number;
    },
  ): Promise<DashboardWidget> {
    // 验证 dashboard 存在
    await Dashboard.findOrFail(dashboardId);

    // 验证 config 中的关联资源存在
    if (data.type === 'chart') {
      const config = data.config as { chartId: number };
      await Chart.findOrFail(config.chartId);
    } else if (data.type === 'dataset') {
      const config = data.config as { datasetId: number };
      await Dataset.findOrFail(config.datasetId);
    }

    // 获取当前最大的 order 值
    const maxOrder = await DashboardWidget.query()
      .where('dashboard_id', dashboardId)
      .max('order as max_order')
      .first();
    const nextOrder = (maxOrder?.$extras.max_order as number | undefined) ?? -1;

    return DashboardWidget.create({
      dashboardId,
      title: data.title,
      type: data.type,
      x: data.x,
      y: data.y,
      w: data.w,
      h: data.h,
      config: data.config,
      order: data.order ?? nextOrder + 1,
    });
  }

  /**
   * 更新 widget
   */
  async updateWidget(
    id: number,
    data: Partial<{
      title: string;
      type: 'chart' | 'dataset' | 'text';
      x: number;
      y: number;
      w: number;
      h: number;
      config: WidgetConfig;
      order: number;
    }>,
  ): Promise<DashboardWidget> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid widget ID');
    }
    const widget = await DashboardWidget.findOrFail(validId);

    // 如果更新 config，验证关联资源存在
    if (data.config) {
      const type = data.type ?? widget.type;
      if (type === 'chart') {
        const config = data.config as { chartId: number };
        await Chart.findOrFail(config.chartId);
      } else if (type === 'dataset') {
        const config = data.config as { datasetId: number };
        await Dataset.findOrFail(config.datasetId);
      }
    }

    widget.merge(data);
    await widget.save();
    return widget;
  }

  /**
   * 删除 widget
   */
  async removeWidget(id: number): Promise<void> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid widget ID');
    }
    const widget = await DashboardWidget.findOrFail(validId);
    await widget.delete();
  }

  /**
   * 批量更新布局
   */
  async updateLayout(
    dashboardId: number,
    layouts: Array<{
      id: number;
      x: number;
      y: number;
      w: number;
      h: number;
    }>,
  ): Promise<void> {
    // 验证 dashboard 存在
    await Dashboard.findOrFail(dashboardId);

    // 批量更新所有 widgets 的位置和大小
    for (const layout of layouts) {
      const widget = await DashboardWidget.find(layout.id);
      if (!widget) {
        throw new Error(`Widget with id ${layout.id} not found`);
      }
      if (widget.dashboardId !== dashboardId) {
        throw new Error(`Widget ${layout.id} does not belong to dashboard ${dashboardId}`);
      }
      widget.x = layout.x;
      widget.y = layout.y;
      widget.w = layout.w;
      widget.h = layout.h;
      await widget.save();
    }
  }

  /**
   * 刷新 widget 数据（验证关联资源是否存在）
   */
  async refreshWidget(id: number): Promise<{ valid: boolean }> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid widget ID');
    }
    const widget = await DashboardWidget.findOrFail(validId);

    // 验证关联资源是否存在
    if (widget.type === 'chart') {
      const config = widget.config as { chartId: number };
      const chart = await Chart.find(config.chartId);
      if (!chart) {
        return { valid: false };
      }
    } else if (widget.type === 'dataset') {
      const config = widget.config as { datasetId: number };
      const dataset = await Dataset.find(config.datasetId);
      if (!dataset) {
        return { valid: false };
      }
    }

    return { valid: true };
  }
}
