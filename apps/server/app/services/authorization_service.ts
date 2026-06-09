import {
  DATASOURCE_PERMISSIONS,
  type AuthorizationAction,
  type AuthorizationResource,
  type AuthorizationUser,
  type DatasourceGrant,
  type DatasourcePermission,
} from '../types/authorization.js';

export interface DatasourceGrantReader {
  listForDatasource(datasourceId: number): Promise<DatasourceGrant[]>;
}

const datasourcePermissionSet = new Set<string>(DATASOURCE_PERMISSIONS);

const datasourcePermissionImplications: Record<DatasourcePermission, DatasourcePermission[]> = {
  'datasource:view': ['datasource:view'],
  'datasource:query': ['datasource:view', 'datasource:query'],
  'datasource:sync_schema': ['datasource:view', 'datasource:sync_schema'],
  'datasource:manage': [
    'datasource:view',
    'datasource:query',
    'datasource:sync_schema',
    'datasource:manage',
  ],
  'datasource:manage_credentials': [
    'datasource:view',
    'datasource:query',
    'datasource:sync_schema',
    'datasource:manage',
    'datasource:manage_credentials',
  ],
  'datasource:grant': ['datasource:view', 'datasource:grant'],
};

const legacyDatasourcePermissions: Record<string, DatasourcePermission[]> = {
  'read:*': ['datasource:view', 'datasource:query'],
  'read:datasource': ['datasource:view', 'datasource:query'],
  'datasource:read': ['datasource:view', 'datasource:query'],
  'write:*': [
    'datasource:view',
    'datasource:query',
    'datasource:sync_schema',
    'datasource:manage',
    'datasource:manage_credentials',
  ],
  'write:datasource': [
    'datasource:view',
    'datasource:query',
    'datasource:sync_schema',
    'datasource:manage',
    'datasource:manage_credentials',
  ],
  'datasource:write': [
    'datasource:view',
    'datasource:query',
    'datasource:sync_schema',
    'datasource:manage',
    'datasource:manage_credentials',
  ],
  'delete:*': ['datasource:manage'],
  'delete:datasource': ['datasource:manage'],
  'datasource:delete': ['datasource:manage'],
};

export class AuthorizationService {
  constructor(private readonly datasourceGrants: DatasourceGrantReader) {}

  async can(
    user: AuthorizationUser | null | undefined,
    action: AuthorizationAction,
    resource: AuthorizationResource,
  ): Promise<boolean> {
    if (!user?.isActive) {
      return false;
    }

    if (this.hasGlobalPermission(user, action)) {
      return true;
    }

    if (resource.type === 'datasource') {
      const grants = await this.datasourceGrants.listForDatasource(resource.id);
      return grants.some((grant) => this.grantAllows(user, grant, action));
    }

    return false;
  }

  async assertCan(
    user: AuthorizationUser | null | undefined,
    action: AuthorizationAction,
    resource: AuthorizationResource,
  ): Promise<void> {
    const allowed = await this.can(user, action, resource);
    if (!allowed) {
      throw new Error(`Forbidden: missing ${action} on ${resource.type}:${resource.id}`);
    }
  }

  private hasGlobalPermission(user: AuthorizationUser, action: AuthorizationAction): boolean {
    if (user.roles.includes('admin')) {
      return true;
    }

    return user.permissions.some((permission) => {
      if (permission === '*') {
        return true;
      }
      if (permission === action) {
        return true;
      }
      if (permission === 'datasource:*') {
        return action.startsWith('datasource:');
      }

      const legacyPermissions = legacyDatasourcePermissions[permission];
      return legacyPermissions ? legacyPermissions.includes(action) : false;
    });
  }

  private grantAllows(
    user: AuthorizationUser,
    grant: DatasourceGrant,
    action: AuthorizationAction,
  ): boolean {
    if (!this.subjectMatches(user, grant)) {
      return false;
    }

    return grant.permissions.some((permission) =>
      this.datasourcePermissionAllows(permission, action),
    );
  }

  private subjectMatches(user: AuthorizationUser, grant: DatasourceGrant): boolean {
    if (grant.subjectType === 'user') {
      return grant.subjectId === String(user.id);
    }

    return user.roles.includes(grant.subjectId);
  }

  private datasourcePermissionAllows(
    grantedPermission: DatasourcePermission,
    requestedAction: AuthorizationAction,
  ): boolean {
    if (!datasourcePermissionSet.has(grantedPermission)) {
      return false;
    }

    return datasourcePermissionImplications[grantedPermission].includes(requestedAction);
  }
}
