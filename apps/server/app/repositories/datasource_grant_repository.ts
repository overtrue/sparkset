import DatasourceGrantModel from '../models/datasource_grant.js';
import type { DatasourceGrant } from '../types/authorization.js';
import type { DatasourceGrantReader } from '../services/authorization_service.js';

export class LucidDatasourceGrantRepository implements DatasourceGrantReader {
  async listForDatasource(datasourceId: number): Promise<DatasourceGrant[]> {
    const rows = await DatasourceGrantModel.query()
      .where('datasource_id', datasourceId)
      .orderBy('created_at', 'asc');

    return rows.map(this.mapRow);
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
