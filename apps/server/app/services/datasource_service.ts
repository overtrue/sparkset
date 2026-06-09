import type { DatasourceRepository } from '../db/interfaces.js';
import type { DataSource } from '../models/types.js';
import type { DatasourceGrantRepository } from '../db/interfaces.js';
import { AuthorizationService } from './authorization_service.js';
import {
  DATASOURCE_PERMISSIONS,
  type AuthorizationUser,
  type DatasourceGrant,
  type DatasourcePermission,
  type GrantSubjectType,
} from '../types/authorization.js';

export type CreateDataSourceInput = Omit<DataSource, 'id' | 'lastSyncAt'>;
export type UpdateDataSourceInput = Partial<DataSource> & { id: number };

/**
 * Datasource service that uses a repository for data access.
 * The repository must be provided - use InMemoryDatasourceRepository for testing
 * or LucidDatasourceRepository for production.
 */
export class DatasourceService {
  constructor(
    private repo: DatasourceRepository,
    private grantRepo?: DatasourceGrantRepository,
    private authorization?: AuthorizationService,
  ) {}

  async list(): Promise<DataSource[]> {
    return this.repo.list();
  }

  async listAuthorized(
    user: AuthorizationUser,
    action: DatasourcePermission = 'datasource:view',
  ): Promise<DataSource[]> {
    const list = await this.repo.list();
    if (!this.authorization) {
      return list;
    }

    const result: DataSource[] = [];
    for (const datasource of list) {
      const allowed = await this.authorization.can(user, action, {
        type: 'datasource',
        id: datasource.id,
      });
      if (allowed) {
        result.push(datasource);
      }
    }
    return result;
  }

  async get(id: number): Promise<DataSource | null> {
    const list = await this.repo.list();
    return list.find((item) => item.id === id) || null;
  }

  async create(input: CreateDataSourceInput, creator?: AuthorizationUser): Promise<DataSource> {
    // If first datasource (list is empty), auto set as default
    const list = await this.repo.list();
    const normalizedInput = {
      ...input,
      creatorId: creator?.id ?? input.creatorId,
      updaterId: creator?.id ?? input.updaterId,
    };
    if (list.length === 0) {
      normalizedInput.isDefault = true;
    }
    const created = await this.repo.create(normalizedInput);

    if (creator && this.grantRepo) {
      await this.grantRepo.upsert({
        datasourceId: created.id,
        subjectType: 'user',
        subjectId: String(creator.id),
        permissions: [...DATASOURCE_PERMISSIONS],
        createdBy: creator.id,
      });
    }

    return created;
  }

  async update(input: UpdateDataSourceInput, updater?: AuthorizationUser): Promise<DataSource> {
    return this.repo.update({
      ...input,
      updaterId: updater?.id ?? input.updaterId,
    });
  }

  async remove(id: number): Promise<void> {
    await this.repo.remove(id);
  }

  async sync(id: number): Promise<Date | undefined> {
    const list = await this.repo.list();
    const target = list.find((item) => item.id === id);
    if (!target) throw new Error('Datasource not found');
    const updated = await this.repo.update({ ...target, lastSyncAt: new Date() });
    return updated.lastSyncAt;
  }

  async setDefault(id: number): Promise<void> {
    await this.repo.setDefault(id);
  }

  async listGrants(datasourceId: number): Promise<DatasourceGrant[]> {
    return this.grantRepo?.listForDatasource(datasourceId) ?? [];
  }

  async grantDatasource(input: {
    datasourceId: number;
    subjectType: GrantSubjectType;
    subjectId: string;
    permissions: DatasourcePermission[];
    createdBy?: number | null;
  }): Promise<DatasourceGrant> {
    if (!this.grantRepo) {
      throw new Error('Datasource grant repository is not configured');
    }

    return this.grantRepo.upsert(input);
  }

  async revokeDatasourceGrant(
    datasourceId: number,
    subjectType: GrantSubjectType,
    subjectId: string,
  ): Promise<void> {
    await this.grantRepo?.remove(datasourceId, subjectType, subjectId);
  }
}
