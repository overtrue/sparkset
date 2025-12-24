import { inject } from '@adonisjs/core';
import type { Database } from '@adonisjs/lucid/database';
import Dataset from '../models/dataset.js';
import { DatasourceService } from './datasource_service.js';
import type { ColumnType, ResultSet } from '../types/chart.js';
import { createLucidDBClientFactory } from '../db/lucid-db-client.js';

@inject()
export class DatasetService {
  constructor(
    private database: Database,
    private datasourceService: DatasourceService,
  ) {}

  /**
   * 列表
   */
  async list(
    userId?: number,
  ): Promise<Array<Record<string, unknown> & { datasourceName: string }>> {
    void userId;
    const query = Dataset.query().preload('datasource');
    // For now, ignore userId filter (no auth)
    const datasets = await query.orderBy('created_at', 'desc');
    return datasets.map((dataset) => ({
      ...dataset.serialize(),
      datasourceName: dataset.datasource?.name || '',
    }));
  }

  /**
   * 详情
   */
  async get(
    id: number,
    userId?: number,
  ): Promise<(Record<string, unknown> & { datasourceName: string }) | null> {
    void userId;
    const query = Dataset.query().where('id', id).preload('datasource');
    // For now, ignore userId filter (no auth)
    const dataset = await query.first();
    if (!dataset) return null;
    return {
      ...dataset.serialize(),
      datasourceName: dataset.datasource?.name || '',
    };
  }

  /**
   * 创建
   */
  async create(data: {
    datasourceId: number;
    name: string;
    description?: string;
    querySql: string;
    schemaJson: Array<{ name: string; type: string }>;
    ownerId?: number;
  }): Promise<Dataset> {
    // 计算 schema hash
    const schemaHash = this.computeSchemaHash(data.schemaJson);

    return Dataset.create({
      datasourceId: data.datasourceId,
      name: data.name,
      description: data.description,
      querySql: data.querySql,
      schemaJson: data.schemaJson,
      schemaHash,
      ownerId: data.ownerId,
    });
  }

  /**
   * 更新
   */
  async update(
    id: number,
    data: Partial<{
      name: string;
      description: string;
      querySql: string;
      schemaJson: Array<{ name: string; type: string }>;
      schemaHash: string;
    }>,
  ): Promise<Dataset> {
    const dataset = await Dataset.findOrFail(id);

    const updateData = { ...data };
    if (data.schemaJson) {
      updateData.schemaHash = this.computeSchemaHash(data.schemaJson);
    }

    dataset.merge(updateData);
    await dataset.save();
    return dataset;
  }

  /**
   * 删除
   */
  async delete(id: number): Promise<void> {
    const dataset = await Dataset.findOrFail(id);
    await dataset.delete();
  }

  /**
   * 执行数据集（预览）
   */
  async execute(datasetId: number, params?: Record<string, unknown>): Promise<ResultSet> {
    const dataset = await Dataset.findOrFail(datasetId);
    const datasource = await this.datasourceService.get(dataset.datasourceId);

    if (!datasource) {
      throw new Error('Datasource not found');
    }

    // 创建数据库客户端
    const clientFactory = createLucidDBClientFactory(this.database);
    const client = clientFactory({
      id: datasource.id,
      name: datasource.name,
      type: datasource.type as any,
      host: datasource.host,
      port: datasource.port,
      username: datasource.username,
      password: datasource.password,
      database: datasource.database,
    });

    // 替换 SQL 中的参数占位符
    let sql = dataset.querySql;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        // 简单的参数替换（生产环境应使用预处理语句）
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        sql = sql.replace(regex, `'${String(value)}'`);
      }
    }

    // 执行查询
    const result = await client.query(
      {
        id: datasource.id,
        name: datasource.name,
        type: datasource.type as any,
        host: datasource.host,
        port: datasource.port,
        username: datasource.username,
        password: datasource.password,
        database: datasource.database,
      },
      sql,
    );

    return {
      schema: {
        columns: dataset.schemaJson.map((col) => ({
          name: col.name,
          type: col.type as ColumnType,
        })),
      },
      rows: result.rows as Record<string, unknown>[],
      rowCount: result.rows.length,
    };
  }

  /**
   * 计算 Schema Hash
   */
  private computeSchemaHash(schema: Array<{ name: string; type: string }>): string {
    const canonical = JSON.stringify(schema.sort((a, b) => a.name.localeCompare(b.name)));
    // 使用简单的 hash（生产环境可使用 crypto）
    let hash = 0;
    for (let i = 0; i < canonical.length; i++) {
      const char = canonical.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return `sha256:${hash.toString(16)}`;
  }
}
