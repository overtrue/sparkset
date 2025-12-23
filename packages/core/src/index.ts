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
export type { AIClient, ModelCallOptions, PromptOptions } from './ai';
export { buildPrompt } from './ai';

// Export query executor
export { QueryExecutor } from './query/executor';
export type { ExecutorDeps } from './query/executor';

// Export query planner
export { QueryPlanner } from './query/planner';
export type { PlannerDeps, SchemaHint } from './query/planner';

// Export query types
export type { ExecutionResult, PlannedQuery, SqlSnippet } from './query/types';

// Export tools
export * from './tools';
