/**
 * Serialization utilities for safe data transfer
 * Filters out sensitive fields before sending responses
 */

import type { DataSource, AIProvider } from '../models/types.js';

/**
 * DataSource without sensitive fields (password)
 */
export type SafeDataSource = Omit<DataSource, 'password'>;

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
export function serializeDataSource(datasource: DataSource): SafeDataSource {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...safe } = datasource;
  return safe;
}

/**
 * Serialize multiple DataSources
 */
export function serializeDataSources(datasources: DataSource[]): SafeDataSource[] {
  return datasources.map(serializeDataSource);
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
