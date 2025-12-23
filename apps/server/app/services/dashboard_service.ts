import { inject } from '@adonisjs/core';
import Dashboard from '../models/dashboard.js';
import { toId } from '../utils/validation.js';

@inject()
export class DashboardService {
  /**
   * 列表
   */
  async list(userId?: number): Promise<Dashboard[]> {
    void userId;
    const query = Dashboard.query().preload('widgets');
    // For now, ignore userId filter (no auth)
    return query.orderBy('created_at', 'desc');
  }

  /**
   * 详情
   */
  async get(id: number, userId?: number): Promise<Dashboard | null> {
    void userId;
    const validId = toId(id);
    if (!validId) {
      return null;
    }
    const query = Dashboard.query()
      .preload('widgets', (widgetQuery) => {
        widgetQuery.orderBy('order', 'asc');
      })
      .where('id', validId);
    // For now, ignore userId filter (no auth)
    return query.first();
  }

  /**
   * 创建
   */
  async create(data: {
    title: string;
    description?: string;
    ownerId?: number;
  }): Promise<Dashboard> {
    return Dashboard.create({
      title: data.title,
      description: data.description,
      ownerId: data.ownerId,
    });
  }

  /**
   * 更新
   */
  async update(
    id: number,
    data: Partial<{
      title: string;
      description: string;
    }>,
  ): Promise<Dashboard> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid dashboard ID');
    }
    const dashboard = await Dashboard.findOrFail(validId);
    dashboard.merge(data);
    await dashboard.save();
    return dashboard;
  }

  /**
   * 删除
   */
  async delete(id: number): Promise<void> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid dashboard ID');
    }
    const dashboard = await Dashboard.findOrFail(validId);
    // Widgets will be cascade deleted
    await dashboard.delete();
  }
}
