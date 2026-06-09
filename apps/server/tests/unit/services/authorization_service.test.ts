import { describe, expect, it } from 'vitest';
import {
  AuthorizationService,
  type DatasourceGrantReader,
} from '../../../app/services/authorization_service.js';
import type {
  AuthorizationUser,
  DatasourceGrant,
  DatasourcePermission,
} from '../../../app/types/authorization.js';

class FakeGrantReader implements DatasourceGrantReader {
  constructor(private readonly grants: DatasourceGrant[]) {}

  async listForDatasource(datasourceId: number): Promise<DatasourceGrant[]> {
    return this.grants.filter((grant) => grant.datasourceId === datasourceId);
  }
}

function user(input: Partial<AuthorizationUser> = {}): AuthorizationUser {
  return {
    id: input.id ?? 1,
    roles: input.roles ?? [],
    permissions: input.permissions ?? [],
    isActive: input.isActive ?? true,
  };
}

function grant(input: {
  datasourceId: number;
  subjectType: 'user' | 'role';
  subjectId: string;
  permissions: DatasourcePermission[];
}): DatasourceGrant {
  return {
    id: 1,
    datasourceId: input.datasourceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    permissions: input.permissions,
  };
}

describe('AuthorizationService', () => {
  it('allows admins to manage datasource credentials', async () => {
    const service = new AuthorizationService(new FakeGrantReader([]));

    const allowed = await service.can(user({ roles: ['admin'] }), 'datasource:manage_credentials', {
      type: 'datasource',
      id: 10,
    });

    expect(allowed).toBe(true);
  });

  it('allows wildcard datasource permissions', async () => {
    const service = new AuthorizationService(new FakeGrantReader([]));

    const allowed = await service.can(user({ permissions: ['datasource:*'] }), 'datasource:query', {
      type: 'datasource',
      id: 10,
    });

    expect(allowed).toBe(true);
  });

  it('does not let legacy datasource read permissions bypass datasource grants', async () => {
    const service = new AuthorizationService(new FakeGrantReader([]));
    const currentUser = user({ permissions: ['read:datasource'] });

    await expect(
      service.can(currentUser, 'datasource:view', { type: 'datasource', id: 10 }),
    ).resolves.toBe(false);
    await expect(
      service.can(currentUser, 'datasource:query', { type: 'datasource', id: 10 }),
    ).resolves.toBe(false);
    await expect(
      service.can(currentUser, 'datasource:manage', { type: 'datasource', id: 10 }),
    ).resolves.toBe(false);
  });

  it('allows role grants on a datasource', async () => {
    const service = new AuthorizationService(
      new FakeGrantReader([
        grant({
          datasourceId: 10,
          subjectType: 'role',
          subjectId: 'analyst',
          permissions: ['datasource:query'],
        }),
      ]),
    );

    const allowed = await service.can(user({ roles: ['analyst'] }), 'datasource:query', {
      type: 'datasource',
      id: 10,
    });

    expect(allowed).toBe(true);
  });

  it('denies users without a matching datasource grant', async () => {
    const service = new AuthorizationService(
      new FakeGrantReader([
        grant({
          datasourceId: 20,
          subjectType: 'user',
          subjectId: '2',
          permissions: ['datasource:query'],
        }),
      ]),
    );

    const allowed = await service.can(user({ id: 1 }), 'datasource:query', {
      type: 'datasource',
      id: 20,
    });

    expect(allowed).toBe(false);
  });
});
