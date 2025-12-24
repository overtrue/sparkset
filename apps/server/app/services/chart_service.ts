import { inject } from '@adonisjs/core';
import Chart from '../models/chart.js';
import Dataset from '../models/dataset.js';
import { ChartCompiler } from './chart_compiler.js';
import { DatasetService } from './dataset_service.js';
import type { ChartSpec, ChartRenderResult } from '../types/chart.js';
import { toId } from '../utils/validation.js';

@inject()
export class ChartService {
  constructor(
    private datasetService: DatasetService,
    private chartCompiler: ChartCompiler,
  ) {}

  /**
   * 列表
   */
  async list(datasetId?: number, userId?: number): Promise<Chart[]> {
    void userId;
    const query = Chart.query().preload('dataset');
    if (datasetId) {
      query.where('dataset_id', datasetId);
    }
    // For now, ignore userId filter (no auth)
    return query.orderBy('created_at', 'desc');
  }

  /**
   * 详情
   */
  async get(id: number, userId?: number): Promise<Chart | null> {
    void userId;
    const validId = toId(id);
    if (!validId) {
      return null;
    }
    const query = Chart.query().preload('dataset').where('id', validId);
    // For now, ignore userId filter (no auth)
    return query.first();
  }

  /**
   * 创建
   */
  async create(data: {
    datasetId: number;
    title: string;
    description?: string;
    chartType: ChartSpec['chartType'];
    spec: ChartSpec;
    ownerId?: number;
  }): Promise<Chart> {
    // 验证 spec 与 dataset schema 兼容性
    const dataset = await Dataset.findOrFail(data.datasetId);
    const validation = this.chartCompiler.validate(data.spec, dataset.schemaJson);

    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    return Chart.create({
      datasetId: data.datasetId,
      title: data.title,
      description: data.description,
      chartType: data.chartType,
      specJson: data.spec,
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
      chartType: ChartSpec['chartType'];
      spec: ChartSpec;
    }>,
  ): Promise<Chart> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid chart ID');
    }
    const chart = await Chart.findOrFail(validId);

    // 如果更新 spec，需要验证
    if (data.spec) {
      const dataset = await Dataset.findOrFail(chart.datasetId);
      const validation = this.chartCompiler.validate(data.spec, dataset.schemaJson);

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Transform spec to specJson for the model
    const updateData: any = { ...data };
    if (updateData.spec) {
      updateData.specJson = updateData.spec;
      delete updateData.spec;
    }

    chart.merge(updateData);
    await chart.save();
    return chart;
  }

  /**
   * 删除
   */
  async delete(id: number): Promise<void> {
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid chart ID');
    }
    const chart = await Chart.findOrFail(validId);
    await chart.delete();
  }

  /**
   * 渲染图表（从保存的配置）
   */
  async render(id: number, useCache = true): Promise<ChartRenderResult> {
    void useCache;
    const validId = toId(id);
    if (!validId) {
      throw new Error('Invalid chart ID');
    }
    const chart = await Chart.findOrFail(validId);
    const dataset = await Dataset.findOrFail(chart.datasetId);

    // 执行 dataset 获取数据
    const resultSet = await this.datasetService.execute(dataset.id);

    // 编译为前端配置
    return this.chartCompiler.compile(chart.specJson, resultSet);
  }

  /**
   * 预览图表（不保存）
   */
  async preview(datasetId: number, spec: ChartSpec): Promise<ChartRenderResult> {
    const dataset = await Dataset.findOrFail(datasetId);

    // 执行 dataset 获取数据
    const resultSet = await this.datasetService.execute(dataset.id);

    // 编译为前端配置
    return this.chartCompiler.compile(spec, resultSet);
  }
}
