export const DATASOURCE_PERMISSIONS = [
  'datasource:view',
  'datasource:query',
  'datasource:sync_schema',
  'datasource:manage',
  'datasource:manage_credentials',
  'datasource:grant',
] as const;

export const GLOBAL_AUTHORIZATION_ACTIONS = [
  'datasource:create',
  'ai_provider:view',
  'ai_provider:manage',
  'ai_provider:manage_credentials',
  'action:view',
  'action:execute',
  'action:manage',
] as const;

export type DatasourcePermission = (typeof DATASOURCE_PERMISSIONS)[number];
export type GlobalAuthorizationAction = (typeof GLOBAL_AUTHORIZATION_ACTIONS)[number];
export type AuthorizationAction = DatasourcePermission;

export interface AuthorizationUser {
  id: number;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export interface DatasourceResource {
  type: 'datasource';
  id: number;
}

export type AuthorizationResource = DatasourceResource;
export type GrantSubjectType = 'user' | 'role';

export interface DatasourceGrant {
  id?: number;
  datasourceId: number;
  subjectType: GrantSubjectType;
  subjectId: string;
  permissions: DatasourcePermission[];
  createdBy?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}
