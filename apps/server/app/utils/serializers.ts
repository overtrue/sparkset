/**
 * Serialization utilities for safe data transfer
 * Filters out sensitive fields before sending responses
 */

import type { DataSource, AIProvider } from '../models/types.js';
import type { DatasourcePermission } from '../types/authorization.js';

export interface DatasourceCapabilities {
  canView: boolean;
  canQuery: boolean;
  canSyncSchema: boolean;
  canManage: boolean;
  canManageCredentials: boolean;
  canGrant: boolean;
}

/**
 * DataSource without sensitive fields (password)
 */
export type SafeDataSource = Omit<DataSource, 'password'> & {
  capabilities?: DatasourceCapabilities;
};

/**
 * AIProvider without sensitive fields (apiKey)
 */
export type SafeAIProvider = Omit<AIProvider, 'apiKey'> & {
  /** Indicates whether an API key is configured (without exposing the actual key) */
  hasApiKey: boolean;
};

/**
 * Serialize a DataSource, removing the password field
 */
export function serializeDataSource(
  datasource: DataSource,
  options: { capabilities?: DatasourceCapabilities } = {},
): SafeDataSource {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...safe } = datasource;
  return {
    ...safe,
    ...(options.capabilities ? { capabilities: options.capabilities } : {}),
  };
}

/**
 * Serialize multiple DataSources
 */
export function serializeDataSources(datasources: DataSource[]): SafeDataSource[] {
  return datasources.map((datasource) => serializeDataSource(datasource));
}

export function datasourceCapabilitiesFromPermissions(
  permissions: Record<DatasourcePermission, boolean>,
): DatasourceCapabilities {
  return {
    canView: permissions['datasource:view'],
    canQuery: permissions['datasource:query'],
    canSyncSchema: permissions['datasource:sync_schema'],
    canManage: permissions['datasource:manage'],
    canManageCredentials: permissions['datasource:manage_credentials'],
    canGrant: permissions['datasource:grant'],
  };
}

/**
 * Serialize an AIProvider, removing the apiKey field
 */
export function serializeAIProvider(provider: AIProvider): SafeAIProvider {
  const { apiKey, ...rest } = provider;
  return {
    ...rest,
    hasApiKey: !!apiKey,
  };
}

/**
 * Serialize multiple AIProviders
 */
export function serializeAIProviders(providers: AIProvider[]): SafeAIProvider[] {
  return providers.map(serializeAIProvider);
}
