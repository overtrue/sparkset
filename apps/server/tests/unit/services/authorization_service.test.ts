import { describe, expect, it } from 'vitest';
import {
  AuthorizationService,
  type DatasourceGrantReader,
} from '../../../app/services/authorization_service.js';
import type {
  AuthorizationUser,
  DatasourceGrant,
  DatasourcePermission,
  GlobalAuthorizationAction,
} from '../../../app/types/authorization.js';
import { GLOBAL_AUTHORIZATION_ACTIONS } from '../../../app/types/authorization.js';

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

  it('allows global datasource creation for admin and explicit global permissions', async () => {
    const service = new AuthorizationService(new FakeGrantReader([]));

    expect(service.canPerformGlobalAction(user({ roles: ['admin'] }), 'datasource:create')).toBe(
      true,
    );
    expect(
      service.canPerformGlobalAction(
        user({ permissions: ['datasource:create'] }),
        'datasource:create',
      ),
    ).toBe(true);
    expect(
      service.canPerformGlobalAction(user({ permissions: ['datasource:*'] }), 'datasource:create'),
    ).toBe(true);
  });

  it('denies global datasource creation for inactive or unprivileged users', async () => {
    const service = new AuthorizationService(new FakeGrantReader([]));

    expect(service.canPerformGlobalAction(user({ isActive: false }), 'datasource:create')).toBe(
      false,
    );
    expect(service.canPerformGlobalAction(user(), 'datasource:create')).toBe(false);
    expect(
      service.canPerformGlobalAction(
        user({ permissions: ['datasource:manage_credentials'] }),
        'datasource:create',
      ),
    ).toBe(false);
  });

  it('allows global AI provider actions only for active users with matching global permissions', () => {
    const service = new AuthorizationService(new FakeGrantReader([]));

    expect(
      service.canPerformGlobalAction(
        user({ permissions: ['ai_provider:*'] }),
        'ai_provider:manage_credentials',
      ),
    ).toBe(true);
    expect(
      service.canPerformGlobalAction(
        user({ permissions: ['ai_provider:manage'] }),
        'ai_provider:view',
      ),
    ).toBe(false);
    expect(
      service.canPerformGlobalAction(
        user({ isActive: false, permissions: ['ai_provider:*'] }),
        'ai_provider:view',
      ),
    ).toBe(false);
  });

  it('allows global Action permissions only for active users with matching permissions', () => {
    const service = new AuthorizationService(new FakeGrantReader([]));

    expect(
      service.canPerformGlobalAction(user({ permissions: ['action:*'] }), 'action:execute'),
    ).toBe(true);
    expect(
      service.canPerformGlobalAction(user({ permissions: ['action:manage'] }), 'action:manage'),
    ).toBe(true);
    expect(
      service.canPerformGlobalAction(user({ permissions: ['action:manage'] }), 'action:view'),
    ).toBe(false);
    expect(
      service.canPerformGlobalAction(
        user({ isActive: false, permissions: ['action:*'] }),
        'action:view',
      ),
    ).toBe(false);
  });

  it('treats audit log viewing as a first-class global permission', () => {
    const service = new AuthorizationService(new FakeGrantReader([]));
    const action = 'audit_log:view' as GlobalAuthorizationAction;

    expect(GLOBAL_AUTHORIZATION_ACTIONS).toContain('audit_log:view');
    expect(service.canPerformGlobalAction(user({ roles: ['admin'] }), action)).toBe(true);
    expect(service.canPerformGlobalAction(user({ permissions: ['*'] }), action)).toBe(true);
    expect(service.canPerformGlobalAction(user({ permissions: ['audit_log:*'] }), action)).toBe(
      true,
    );
    expect(service.canPerformGlobalAction(user({ permissions: ['audit_log:view'] }), action)).toBe(
      true,
    );
    expect(service.canPerformGlobalAction(user(), action)).toBe(false);
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
