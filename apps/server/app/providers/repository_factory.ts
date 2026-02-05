/**
 * Repository Factory
 *
 * Factory functions for creating repositories based on database availability.
 * This centralizes repository creation logic and reduces code duplication.
 */

import type {
  ActionRepository,
  AIProviderRepository,
  ConversationRepository,
  DatasourceRepository,
  SchemaCacheRepository,
} from '../db/interfaces.js';
import { LucidActionRepository } from '../repositories/lucid_action_repository.js';
import { LucidAIProviderRepository } from '../repositories/lucid_ai_provider_repository.js';
import { LucidConversationRepository } from '../repositories/lucid_conversation_repository.js';
import { LucidDatasourceRepository } from '../repositories/lucid_datasource_repository.js';
import { LucidSchemaCacheRepository } from '../repositories/lucid_schema_cache_repository.js';

/**
 * All repositories needed by the application
 */
export interface Repositories {
  datasource: DatasourceRepository;
  action: ActionRepository;
  conversation: ConversationRepository;
  aiProvider: AIProviderRepository;
  schemaCache: SchemaCacheRepository;
}

/**
 * Create Lucid-based repositories using database connection
 */
export function createLucidRepositories(): Repositories {
  return {
    datasource: new LucidDatasourceRepository(),
    action: new LucidActionRepository(),
    conversation: new LucidConversationRepository(),
    aiProvider: new LucidAIProviderRepository(),
    schemaCache: new LucidSchemaCacheRepository(),
  };
}

/**
 * Create repositories based on database availability
 */
export function createRepositories(): Repositories {
  return createLucidRepositories();
}
