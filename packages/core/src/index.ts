// Core orchestrates action execution and dispatch to concrete tools.

// Export database types
export type {
  ColumnDefinition,
  DataSourceConfig,
  DBClient,
  QueryResult,
  TableSchema,
} from './db/types.js';

// Export AI types and utilities
export type { AIClient, ActionPromptOptions, ModelCallOptions, PromptOptions } from './ai/index.js';
export { buildActionPrompt, buildPrompt } from './ai/index.js';

// Export query executor
export { QueryExecutor } from './query/executor.js';
export type { ExecutorDeps } from './query/executor.js';

// Export query planner
export { QueryPlanner } from './query/planner.js';
export type { PlannerDeps, SchemaHint } from './query/planner.js';

// Export query types
export type { ExecutionResult, PlannedQuery, SqlSnippet } from './query/types.js';

// Export tools
export * from './tools/index.js';
