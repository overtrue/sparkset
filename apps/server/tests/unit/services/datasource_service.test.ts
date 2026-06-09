import { describe, expect, it, beforeEach } from 'vitest';
import { DatasourceService } from '../../../app/services/datasource_service.js';
import {
  InMemoryDatasourceGrantRepository,
  InMemoryDatasourceRepository,
} from '../../../app/db/in-memory-repositories.js';
import type { DataSource } from '../../../app/models/types.js';
import { AuthorizationService } from '../../../app/services/authorization_service.js';

describe('DatasourceService', () => {
  let service: DatasourceService;
  let repository: InMemoryDatasourceRepository;
  let grantRepository: InMemoryDatasourceGrantRepository;

  const sampleDatasource: Omit<DataSource, 'id' | 'lastSyncAt'> = {
    name: 'Test Datasource',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: 'password',
    database: 'test_db',
    isDefault: false,
  };

  beforeEach(() => {
    repository = new InMemoryDatasourceRepository();
    grantRepository = new InMemoryDatasourceGrantRepository();
    const authorizationService = new AuthorizationService(grantRepository);
    service = new DatasourceService(repository, grantRepository, authorizationService);
  });

  describe('create', () => {
    it('should create a datasource', async () => {
      const result = await service.create(sampleDatasource);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(sampleDatasource.name);
      expect(result.host).toBe(sampleDatasource.host);
      expect(result.database).toBe(sampleDatasource.database);
    });

    it('should auto-set first datasource as default', async () => {
      const result = await service.create({ ...sampleDatasource, isDefault: false });

      expect(result.isDefault).toBe(true);
    });

    it('should not auto-set subsequent datasources as default', async () => {
      await service.create(sampleDatasource);
      const second = await service.create({
        ...sampleDatasource,
        name: 'Second Datasource',
        isDefault: false,
      });

      expect(second.isDefault).toBe(false);
    });

    it('should reject duplicate names', async () => {
      await service.create(sampleDatasource);

      await expect(service.create(sampleDatasource)).rejects.toThrow(
        'Datasource name already exists',
      );
    });
  });

  describe('list', () => {
    it('should return empty list initially', async () => {
      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should return created datasources', async () => {
      await service.create(sampleDatasource);
      await service.create({ ...sampleDatasource, name: 'Another' });

      const result = await service.list();

      expect(result).toHaveLength(2);
    });

    it('should return only datasources visible to the current user', async () => {
      await service.create(sampleDatasource);
      const granted = await service.create({ ...sampleDatasource, name: 'Granted' });
      await grantRepository.upsert({
        datasourceId: granted.id,
        subjectType: 'role',
        subjectId: 'analyst',
        permissions: ['datasource:view'],
      });

      const result = await service.listAuthorized({
        id: 9,
        roles: ['analyst'],
        permissions: [],
        isActive: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(granted.id);
    });
  });

  describe('grant bootstrap', () => {
    it('should grant creator full datasource permissions', async () => {
      const created = await service.create(sampleDatasource, {
        id: 42,
        roles: [],
        permissions: [],
        isActive: true,
      });

      const grants = await grantRepository.listForDatasource(created.id);

      expect(grants).toHaveLength(1);
      expect(grants[0]).toMatchObject({
        datasourceId: created.id,
        subjectType: 'user',
        subjectId: '42',
      });
      expect(grants[0]?.permissions).toContain('datasource:manage_credentials');
      expect(grants[0]?.permissions).toContain('datasource:grant');
    });
  });

  describe('get', () => {
    it('should return null for non-existent id', async () => {
      const result = await service.get(999);

      expect(result).toBeNull();
    });

    it('should return datasource by id', async () => {
      const created = await service.create(sampleDatasource);

      const result = await service.get(created.id);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(created.id);
    });
  });

  describe('update', () => {
    it('should update datasource fields', async () => {
      const created = await service.create(sampleDatasource);

      const updated = await service.update({
        id: created.id,
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.host).toBe(sampleDatasource.host);
    });

    it('should throw for non-existent id', async () => {
      await expect(service.update({ id: 999, name: 'Test' })).rejects.toThrow();
    });
  });

  describe('remove', () => {
    it('should remove datasource', async () => {
      const created = await service.create(sampleDatasource);

      await service.remove(created.id);

      const result = await service.get(created.id);
      expect(result).toBeNull();
    });

    it('should throw for non-existent id', async () => {
      await expect(service.remove(999)).rejects.toThrow();
    });
  });

  describe('setDefault', () => {
    it('should set datasource as default', async () => {
      const first = await service.create(sampleDatasource);
      const second = await service.create({ ...sampleDatasource, name: 'Second' });

      await service.setDefault(second.id);

      const list = await service.list();
      const updatedFirst = list.find((d) => d.id === first.id);
      const updatedSecond = list.find((d) => d.id === second.id);

      expect(updatedFirst!.isDefault).toBe(false);
      expect(updatedSecond!.isDefault).toBe(true);
    });

    it('should throw for non-existent id', async () => {
      await expect(service.setDefault(999)).rejects.toThrow();
    });
  });
});
