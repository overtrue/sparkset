import { DateTime } from 'luxon';
import type { DatasourceRepository } from '../db/interfaces';
import DataSourceModel from '../models/data_source.js';
import type { DataSource } from '../models/types';
import { getDb } from './get-db.js';

export class LucidDatasourceRepository implements DatasourceRepository {
  async list(): Promise<DataSource[]> {
    const rows = await DataSourceModel.query().orderBy('isDefault', 'desc').orderBy('id', 'asc');
    return rows.map(this.mapRow);
  }

  async create(input: Omit<DataSource, 'id' | 'lastSyncAt'>): Promise<DataSource> {
    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault) {
      await DataSourceModel.query().where('isDefault', true).update({ isDefault: false });
    }

    const row = await DataSourceModel.create({
      name: input.name,
      type: input.type,
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password,
      database: input.database,
      isDefault: input.isDefault ?? false,
    });
    return this.mapRow(row);
  }

  async update(input: Partial<DataSource> & { id: number }): Promise<DataSource> {
    // 如果设置为默认，先取消其他数据源的默认状态
    if (input.isDefault === true) {
      await DataSourceModel.query()
        .where('isDefault', true)
        .where('id', '!=', input.id)
        .update({ isDefault: false });
    }

    const row = await DataSourceModel.findOrFail(input.id);
    row.merge({
      name: input.name,
      type: input.type,
      host: input.host,
      port: input.port,
      username: input.username,
      password: input.password,
      database: input.database,
      isDefault: input.isDefault,
      // 将 Date 转换为 luxon.DateTime（Lucid 模型需要）
      lastSyncAt: input.lastSyncAt
        ? (DateTime.fromJSDate(input.lastSyncAt) as DateTime<true>)
        : undefined,
    });
    await row.save();
    return this.mapRow(row);
  }

  async remove(id: number): Promise<void> {
    const db = await getDb();
    const trx = await db.transaction();
    try {
      // Delete related records in order
      await trx.raw(
        `
        DELETE cd FROM column_definitions cd
        INNER JOIN table_schemas ts ON cd.table_schema_id = ts.id
        WHERE ts.datasource_id = ?
      `,
        [id],
      );

      await trx.raw('DELETE FROM table_schemas WHERE datasource_id = ?', [id]);

      await DataSourceModel.query({ client: trx }).where('id', id).delete();

      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  async setDefault(id: number): Promise<void> {
    const db = await getDb();
    const trx = await db.transaction();
    try {
      // 先取消所有数据源的默认状态
      await DataSourceModel.query({ client: trx })
        .where('isDefault', true)
        .update({ isDefault: false });
      // 设置指定数据源为默认
      await DataSourceModel.query({ client: trx }).where('id', id).update({ isDefault: true });
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  private mapRow = (row: DataSourceModel): DataSource => ({
    id: row.id,
    name: row.name,
    type: row.type,
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.password,
    database: row.database,
    isDefault: row.isDefault,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toJSDate() : undefined,
  });
}
