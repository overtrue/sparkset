/**
 * Repository Factory
 *
 * Factory functions for creating repositories based on database availability.
 * This centralizes repository creation logic and reduces code duplication.
 */

import type { Database } from '@adonisjs/lucid/database';
import type {
  ActionRepository,
  AIProviderRepository,
  ConversationRepository,
  DatasourceRepository,
  SchemaCacheRepository,
} from '../db/interfaces.js';
import { InMemorySchemaCacheRepository } from '../db/in-memory.js';
import { LucidActionRepository } from '../repositories/lucid_action_repository.js';
import { LucidAIProviderRepository } from '../repositories/lucid_ai_provider_repository.js';
import { LucidConversationRepository } from '../repositories/lucid_conversation_repository.js';
import { LucidDatasourceRepository } from '../repositories/lucid_datasource_repository.js';
import { LucidSchemaCacheRepository } from '../repositories/lucid_schema_cache_repository.js';
import {
  InMemoryDatasourceRepository,
  InMemoryActionRepository,
  InMemoryConversationRepository,
  InMemoryAIProviderRepository,
} from '../db/in-memory-repositories.js';

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
 * Create in-memory repositories for development/testing without database
 */
export function createInMemoryRepositories(): Repositories {
  return {
    datasource: new InMemoryDatasourceRepository(),
    action: new InMemoryActionRepository(),
    conversation: new InMemoryConversationRepository(),
    aiProvider: new InMemoryAIProviderRepository(),
    schemaCache: new InMemorySchemaCacheRepository(),
  };
}

/**
 * Create repositories based on database availability
 */
export function createRepositories(database: Database | null): Repositories {
  if (database) {
    return createLucidRepositories();
  }
  return createInMemoryRepositories();
}
