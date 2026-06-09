import DatasourceGrantModel from '../models/datasource_grant.js';
import type { DatasourceGrant } from '../types/authorization.js';
import type { DatasourceGrantRepository } from '../db/interfaces.js';

export class LucidDatasourceGrantRepository implements DatasourceGrantRepository {
  async listForDatasource(datasourceId: number): Promise<DatasourceGrant[]> {
    const rows = await DatasourceGrantModel.query()
      .where('datasource_id', datasourceId)
      .orderBy('created_at', 'asc');

    return rows.map(this.mapRow);
  }

  async upsert(
    input: Omit<DatasourceGrant, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<DatasourceGrant> {
    const row = await DatasourceGrantModel.updateOrCreate(
      {
        datasourceId: input.datasourceId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
      },
      {
        datasourceId: input.datasourceId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        permissions: input.permissions,
        createdBy: input.createdBy ?? null,
      },
    );

    return this.mapRow(row);
  }

  async remove(datasourceId: number, subjectType: string, subjectId: string): Promise<void> {
    await DatasourceGrantModel.query()
      .where('datasource_id', datasourceId)
      .where('subject_type', subjectType)
      .where('subject_id', subjectId)
      .delete();
  }

  private mapRow = (row: DatasourceGrantModel): DatasourceGrant => ({
    id: row.id,
    datasourceId: row.datasourceId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    permissions: row.permissions,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toJSDate(),
    updatedAt: row.updatedAt.toJSDate(),
  });
}
