// Core orchestrates action execution and dispatch to concrete tools.

// Export database types
export type {
  ColumnDefinition,
  DataSourceConfig,
  DBClient,
  QueryResult,
  TableSchema,
} from './db/types';

// Export AI types and utilities
export type { AIClient, ActionPromptOptions, ModelCallOptions, PromptOptions } from './ai/index';
export { buildActionPrompt, buildPrompt } from './ai/index';

// Export query executor
export { QueryExecutor } from './query/executor';
export type { ExecutorDeps } from './query/executor';

// Export query planner
export { QueryPlanner } from './query/planner';
export type { PlannerDeps, SchemaHint } from './query/planner';

// Export query types
export type { ExecutionResult, PlannedQuery, SqlSnippet } from './query/types';

// Export tools
export * from './tools/index';

export {
  QUERY_ERROR_CODES,
  QUERY_ERROR_MESSAGES,
  QUERY_ERROR_HTTP_STATUS,
  QUERY_ERROR_TITLES,
  LEGACY_QUERY_ERROR_CODES,
  QUERY_REQUEST_LIMIT_MAX,
  QUERY_REQUEST_QUESTION_MAX_LENGTH,
  CONVERSATION_MESSAGE_METADATA_VERSION,
  CONVERSATION_MESSAGE_METADATA_KIND_QUERY_RESULT,
  DEFAULT_RATE_LIMIT_SECONDS,
  type QueryErrorCode,
  type QueryErrorEnvelope,
  type QueryErrorInput,
  buildQueryErrorResponse,
  normalizeQueryErrorCode,
  parseRateLimitRetryAfter,
} from './query/protocol';
export * from './query/conversation-message-metadata';
